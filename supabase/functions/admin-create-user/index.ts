import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: string;
  username: string;
  isActive: boolean;
  permissionOverrides: Record<string, boolean>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ---- 1. Validate caller is an admin ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create a client with the caller's JWT to verify their identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify the caller is a system_admin by checking the users table
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('role, is_active')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (callerProfile.role !== 'system_admin' || !callerProfile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: only active system admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 2. Parse and validate the request body ----
    const body: CreateUserPayload = await req.json();

    if (!body.email || !body.password || !body.fullName || !body.role || !body.username) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName, role, username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 3. Check username uniqueness ----
    const { data: existingUsername } = await adminClient
      .from('users')
      .select('id')
      .eq('username', body.username)
      .maybeSingle();

    if (existingUsername) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 4. Create the auth user via admin API (service role) ----
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError) {
      // Handle re-creating a previously soft-deleted user:
      // Auth user still exists but public.users row may be inactive.
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', body.email)
        .single();

      if (existingUser) {
        const { error: reactivateError } = await adminClient
          .from('users')
          .update({
            username: body.username,
            full_name: body.fullName,
            role: body.role,
            is_active: body.isActive ?? true,
            permission_overrides: JSON.stringify(body.permissionOverrides || {}),
          })
          .eq('id', existingUser.id);

        if (reactivateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to reactivate user: ' + reactivateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            userId: existingUser.id,
            reactivated: true,
            message: 'Reactivated existing user. The user must log in with their previous password or use password reset.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Not a reactivation case — genuine auth creation failure
      return new Response(
        JSON.stringify({ error: 'Auth user creation failed: ' + authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Auth user creation returned no user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 5. Insert into public.users table ----
    const { error: insertError } = await adminClient.from('users').insert({
      id: authData.user.id,
      username: body.username,
      email: body.email,
      full_name: body.fullName,
      role: body.role,
      is_active: body.isActive ?? true,
      permission_overrides: JSON.stringify(body.permissionOverrides || {}),
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'User profile insert failed: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 6. Return success ----
    return new Response(
      JSON.stringify({
        userId: authData.user.id,
        reactivated: false,
        message: 'User created successfully',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
