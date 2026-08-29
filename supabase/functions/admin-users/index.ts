// Admin-only user management: list / create / update / delete Supabase Auth
// users. Runs server-side because these actions need the service_role key,
// which must never reach the browser.
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically in every Edge Function's environment by Supabase — nothing
// to configure manually for those three.
//
// Deploy: npx supabase functions deploy admin-users

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

  // Request-scoped client, acting as the caller — used only to verify who
  // is calling and whether they're an admin. Never used for the privileged
  // operations below.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) return jsonResponse({ error: 'Not signed in' }, 401);

  const { data: isAdmin, error: adminCheckErr } = await callerClient.rpc('is_admin');
  if (adminCheckErr || !isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

  // Only reachable past this point if the caller is a verified admin.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const action = body.action;

  try {
    if (action === 'list') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, email, full_name, is_admin, last_sign_in_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return jsonResponse({ users: data });
    }

    if (action === 'create') {
      const { email, password, fullName } = body as { email?: string; password?: string; fullName?: string };
      if (!email || !password) return jsonResponse({ error: 'email and password are required' }, 400);

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : {},
      });
      if (error) throw error;
      return jsonResponse({ user: data.user });
    }

    if (action === 'update') {
      const { userId, fullName, password } = body as { userId?: string; fullName?: string; password?: string };
      if (!userId) return jsonResponse({ error: 'userId is required' }, 400);

      const attrs: Record<string, unknown> = {};
      if (password) attrs.password = password;
      if (fullName !== undefined) attrs.user_metadata = { full_name: fullName };

      const { data, error } = await adminClient.auth.admin.updateUserById(userId, attrs);
      if (error) throw error;

      if (fullName !== undefined) {
        await adminClient.from('profiles').update({ full_name: fullName }).eq('id', userId);
      }
      return jsonResponse({ user: data.user });
    }

    if (action === 'delete') {
      const { userId } = body as { userId?: string };
      if (!userId) return jsonResponse({ error: 'userId is required' }, 400);
      if (userId === caller.id) return jsonResponse({ error: "You can't delete your own admin account from here." }, 400);

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
