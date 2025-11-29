import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../lib/supabase';
import { createInquiry, resumeInquiry, listInquiries } from '../../../lib/persona';

// POST: Start or resume KYC verification
export const POST: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const adminSupabase = createSupabaseAdminClient();

    // Check authentication
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending verification
    const { data: existingVerification } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'initiated', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingVerification?.persona_inquiry_id) {
      // Resume existing inquiry
      try {
        const sessionToken = await resumeInquiry(existingVerification.persona_inquiry_id);

        return new Response(JSON.stringify({
          inquiry_id: existingVerification.persona_inquiry_id,
          session_token: sessionToken,
          verification_id: existingVerification.id,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // If resume fails, create new inquiry
      }
    }

    // Check for passed verification
    const { data: passedVerification } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'passed')
      .limit(1)
      .single();

    if (passedVerification) {
      return new Response(JSON.stringify({
        message: 'KYC already verified',
        status: 'passed',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new inquiry
    const referenceId = `user_${user.id}`;
    const nameParts = user.name?.split(' ') || [];

    const { inquiryId, sessionToken } = await createInquiry(
      referenceId,
      user.email,
      nameParts[0],
      nameParts.slice(1).join(' ') || undefined
    );

    // Save verification record
    const { data: verification, error } = await adminSupabase
      .from('kyc_verifications')
      .insert({
        user_id: user.id,
        persona_inquiry_id: inquiryId,
        persona_template_id: import.meta.env.PERSONA_TEMPLATE_ID,
        status: 'initiated',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving KYC verification:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      inquiry_id: inquiryId,
      session_token: sessionToken,
      verification_id: verification.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/kyc/start:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// GET: Get current KYC status
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get latest verification
    const { data: verification } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return new Response(JSON.stringify({
        status: 'not_started',
        message: 'KYC verification not started',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      status: verification.status,
      verification_id: verification.id,
      completed_at: verification.completed_at,
      first_name: verification.first_name,
      last_name: verification.last_name,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/kyc/start:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
