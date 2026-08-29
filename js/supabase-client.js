// Shared Supabase client for EnrichMe.
// Loaded after the Supabase JS CDN script on every app page (index.html,
// dashboard.html, net-worth.html, transactions.html, planner.html).
//
// The anon/publishable key below is safe to expose client-side — it has no
// power on its own. Row Level Security policies on each table (see
// supabase-schema.sql) are what actually restrict a signed-in user to their
// own rows.

const SUPABASE_URL = 'https://vtmfgmmxmoptjflhprbi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SZZIcM3u7MTzTqH-YPfy2A_klixehI5';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Call at the top of any page that requires a signed-in user.
// Redirects to the login page if there's no active session, and otherwise
// resolves with the current user. Also enforces the signup-approval gate:
// an account stuck in 'pending' or 'rejected' (see profiles.status in
// supabase-schema.sql) never reaches any app page, no matter which one it
// tries first — it's bounced to pending-approval.html instead. This is the
// single choke point for that gate, so individual pages don't each need
// their own approval check.
async function requireAuth(loginPath) {
  loginPath = loginPath || 'login.html';
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = loginPath;
    return null;
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('status')
    .eq('id', session.user.id)
    .single();
  if (profile && profile.status !== 'approved') {
    // Reuse loginPath's directory depth (e.g. '../' from split/*.html) so
    // this resolves correctly no matter how deep the calling page is.
    const loginDir = loginPath.slice(0, loginPath.lastIndexOf('/') + 1);
    window.location.href = loginDir + 'pending-approval.html';
    return null;
  }

  return session.user;
}

async function signOutAndRedirect(redirectPath) {
  await supabaseClient.auth.signOut();
  window.location.href = redirectPath || 'index.html';
}

// Whether the current signed-in user is an admin (see profiles.is_admin /
// the is_admin() RPC in supabase-schema.sql). Call after requireAuth().
async function isAdmin() {
  const { data, error } = await supabaseClient.rpc('is_admin');
  if (error) { console.error('Could not check admin status', error); return false; }
  return !!data;
}
