import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { loginSchema } from '../../../types/forms';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error.issues[0].message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = result.data;
    const supabase = createSupabaseServerClient(cookies);

    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine redirect URL based on role
    let redirectUrl = '/';
    if (userData.role === 'lender') {
      redirectUrl = '/lender/dashboard';
    } else if (userData.role === 'investor') {
      // Check if investor is approved
      const { data: investorData } = await supabase
        .from('investors')
        .select('approved')
        .eq('user_id', userData.id)
        .single();

      redirectUrl = investorData?.approved ? '/investor/dashboard' : '/investor/pending';
    } else if (userData.role === 'admin') {
      redirectUrl = '/admin';
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
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
