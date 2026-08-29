// Emails admin@enrichme.app whenever someone signs up, so there's an
// immediate nudge to review it in the Admin Dashboard's Signup Requests
// panel. Called fire-and-forget from login.html right after
// auth.signUp() succeeds - never blocks or fails the signup flow itself,
// since a missing/broken email provider shouldn't stop someone from
// creating an account (they still land in profiles.status = 'pending'
// via the database trigger either way).
//
// Sends through Mailgun (https://mailgun.com). Needs two secrets:
//   npx supabase secrets set MAILGUN_API_KEY=key-xxxxxxxx
//   npx supabase secrets set MAILGUN_DOMAIN=mg.enrichme.app
// MAILGUN_DOMAIN is whichever sending domain is verified in your Mailgun
// account - often a subdomain like mg.enrichme.app, not the bare
// enrichme.app. Find both under Mailgun -> Sending -> Domains, and
// Settings -> API Keys for the key. If your Mailgun account is on the EU
// region, also set:
//   npx supabase secrets set MAILGUN_BASE_URL=https://api.eu.mailgun.net
// (defaults to https://api.mailgun.net, the US region). Until
// MAILGUN_API_KEY and MAILGUN_DOMAIN are both set, this function no-ops
// instead of erroring.
//
// Deploy: npx supabase functions deploy notify-signup-request

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'admin@enrichme.app';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName : '';
  if (!email) return jsonResponse({ error: 'email is required' }, 400);

  const apiKey = Deno.env.get('MAILGUN_API_KEY');
  const domain = Deno.env.get('MAILGUN_DOMAIN');
  if (!apiKey || !domain) {
    return jsonResponse({ ok: true, skipped: 'MAILGUN_API_KEY/MAILGUN_DOMAIN not set' });
  }

  const baseUrl = Deno.env.get('MAILGUN_BASE_URL') || 'https://api.mailgun.net';
  const appUrl = Deno.env.get('APP_URL') || 'https://enrichme.app';
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);

  const form = new URLSearchParams();
  form.set('from', `EnrichMe <notifications@${domain}>`);
  form.set('to', ADMIN_EMAIL);
  form.set('subject', 'New EnrichMe signup request' + (fullName ? ` - ${fullName}` : ''));
  form.set(
    'html',
    '<p>New signup request for EnrichMe:</p>' +
      `<p><b>Name:</b> ${safeName || '(not provided)'}<br>` +
      `<b>Email:</b> ${safeEmail}</p>` +
      `<p>Review and activate it from the <a href="${appUrl}/admin-dashboard.html">Admin Dashboard</a>.</p>`
  );

  try {
    const res = await fetch(`${baseUrl}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`api:${apiKey}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      // Don't 500 the caller over an email-provider hiccup - login.html
      // ignores this response either way.
      const errText = await res.text();
      return jsonResponse({ ok: false, error: errText });
    }
    return jsonResponse({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return jsonResponse({ ok: false, error: message });
  }
});
