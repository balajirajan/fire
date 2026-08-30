// Shared Mailgun sender for every edge function that emails someone - keeps
// the API-call shape and secret names in one place instead of duplicated
// per function (see notify-signup-request and admin-users, both of which
// import this).
//
// Needs two secrets:
//   npx supabase secrets set MAILGUN_API_KEY=key-xxxxxxxx
//   npx supabase secrets set MAILGUN_DOMAIN=mg.enrichme.app
// MAILGUN_DOMAIN is whichever sending domain is verified in your Mailgun
// account - often a subdomain like mg.enrichme.app, not the bare
// enrichme.app. Find both under Mailgun -> Sending -> Domains, and
// Settings -> API Keys for the key. If your Mailgun account is on the EU
// region, also set:
//   npx supabase secrets set MAILGUN_BASE_URL=https://api.eu.mailgun.net
// (defaults to https://api.mailgun.net, the US region). Until
// MAILGUN_API_KEY and MAILGUN_DOMAIN are both set, sendMail() no-ops
// instead of erroring, so a missing/broken email provider never fails the
// action that triggered it (signup, approval, etc.).

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface SendMailResult {
  ok: boolean;
  skipped?: string;
  error?: string;
}

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<SendMailResult> {
  const apiKey = Deno.env.get('MAILGUN_API_KEY');
  const domain = Deno.env.get('MAILGUN_DOMAIN');
  if (!apiKey || !domain) {
    return { ok: true, skipped: 'MAILGUN_API_KEY/MAILGUN_DOMAIN not set' };
  }

  const baseUrl = Deno.env.get('MAILGUN_BASE_URL') || 'https://api.mailgun.net';

  const form = new URLSearchParams();
  form.set('from', `EnrichMe <notifications@${domain}>`);
  form.set('to', opts.to);
  form.set('subject', opts.subject);
  form.set('html', opts.html);

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
      const errText = await res.text();
      return { ok: false, error: errText };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return { ok: false, error: message };
  }
}
