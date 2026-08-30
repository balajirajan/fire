// Emails admin@enrichme.app whenever someone signs up, so there's an
// immediate nudge to review it in the Admin Dashboard's Signup Requests
// panel. Called fire-and-forget from login.html right after
// auth.signUp() succeeds - never blocks or fails the signup flow itself,
// since a missing/broken email provider shouldn't stop someone from
// creating an account (they still land in profiles.status = 'pending'
// via the database trigger either way).
//
// Sends through Mailgun - see _shared/mailgun.ts for the two required
// secrets and how to configure them.
//
// Deploy: npx supabase functions deploy notify-signup-request

import { sendMail, escapeHtml } from '../_shared/mailgun.ts';

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

  const appUrl = Deno.env.get('APP_URL') || 'https://enrichme.app';
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);

  const result = await sendMail({
    to: ADMIN_EMAIL,
    subject: 'New EnrichMe signup request' + (fullName ? ` - ${fullName}` : ''),
    html:
      '<p>New signup request for EnrichMe:</p>' +
      `<p><b>Name:</b> ${safeName || '(not provided)'}<br>` +
      `<b>Email:</b> ${safeEmail}</p>` +
      `<p>Review and activate it from the <a href="${appUrl}/admin-dashboard.html">Admin Dashboard</a>.</p>`,
  });
  return jsonResponse(result);
});
