// Shared Supabase client for FinFlow.
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
// resolves with the current user.
async function requireAuth(loginPath) {
  loginPath = loginPath || 'index.html#login';
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = loginPath;
    return null;
  }
  return session.user;
}

async function signOutAndRedirect(redirectPath) {
  await supabaseClient.auth.signOut();
  window.location.href = redirectPath || 'index.html';
}
