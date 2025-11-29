import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../lib/supabase';
import { signupSchema } from '../../../types/forms';
import { sendLenderEmail, sendInvestorEmail, sendAdminEmail } from '../../../lib/email';

// Admin emails to notify on new signups
const ADMIN_NOTIFICATION_EMAILS = ['admin@primebridge.finance'];

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

    // Create role-specific profile
    if (role === 'lender') {
      const { error: lenderError } = await adminClient
        .from('lenders')
        .insert({
          user_id: userData.id,
          company_name: name, // Use name as initial company name, they'll update later
          primary_contact_name: name,
          primary_contact_email: email,
          loan_types: [],
          status: 'pending',
        });

      if (lenderError) {
        console.error('Failed to create lender profile:', lenderError);
      }
    } else if (role === 'investor') {
      const { error: investorError } = await adminClient
        .from('investors')
        .insert({
          user_id: userData.id,
          investor_type: 'individual',
          accreditation_status: 'pending',
          approved: false,
          total_invested: 0,
          total_deals: 0,
        });

      if (investorError) {
        console.error('Failed to create investor profile:', investorError);
      }
    }

    // Determine redirect URL based on role
    let redirectUrl = '/lender/dashboard';
    if (role === 'investor') {
      redirectUrl = '/investor/pending';
    } else if (role === 'lender') {
      redirectUrl = '/lender/dashboard';
    }

    // Send welcome emails (non-blocking)
    try {
      if (role === 'lender') {
        // Send welcome email to lender
        sendLenderEmail('welcome', email, {
          name,
          companyName: name, // They'll update this later
        }).catch(err => console.error('[Signup] Failed to send lender welcome email:', err));

        // Notify admins of new lender
        sendAdminEmail('newLenderAlert', ADMIN_NOTIFICATION_EMAILS, {
          lenderName: name,
          companyName: name,
          email,
          lenderId: userData.id,
        }).catch(err => console.error('[Signup] Failed to send admin lender alert:', err));
      } else if (role === 'investor') {
        // Send welcome email to investor
        sendInvestorEmail('welcome', email, {
          name,
        }).catch(err => console.error('[Signup] Failed to send investor welcome email:', err));

        // Notify admins of new investor
        sendAdminEmail('newInvestorAlert', ADMIN_NOTIFICATION_EMAILS, {
          investorName: name,
          email,
          investorType: 'Pending Accreditation',
          investorId: userData.id,
        }).catch(err => console.error('[Signup] Failed to send admin investor alert:', err));
      }
    } catch (emailError) {
      // Log email errors but don't fail signup
      console.error('[Signup] Email notification error:', emailError);
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
