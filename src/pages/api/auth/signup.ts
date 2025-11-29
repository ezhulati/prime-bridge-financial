import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../lib/supabase';
import { signupSchema } from '../../../types/forms';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error.issues[0].message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, name, role } = result.data;
    const supabase = createSupabaseServerClient(cookies);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use admin client to bypass RLS for initial user creation
    const adminClient = createSupabaseAdminClient();

    // Create user profile in our users table
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        name,
        role,
      })
      .select()
      .single();

    if (userError) {
      // Clean up auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If investor, create investor profile
    if (role === 'investor') {
      const { error: investorError } = await adminClient
        .from('investors')
        .insert({
          user_id: userData.id,
          approved: false,
        });

      if (investorError) {
        console.error('Failed to create investor profile:', investorError);
      }
    }

    // Determine redirect URL based on role
    let redirectUrl = '/dashboard';
    if (role === 'investor') {
      redirectUrl = '/investor/pending';
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl,
        user: userData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
