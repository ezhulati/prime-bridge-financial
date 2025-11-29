import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../../lib/supabase';

export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const { id } = params;
    const supabase = createSupabaseServerClient(cookies);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the user record
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!userRecord) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the lender profile
    const { data: lender } = await supabase
      .from('lenders')
      .select('id, status')
      .eq('user_id', userRecord.id)
      .single();

    if (!lender) {
      return new Response(JSON.stringify({ message: 'Lender not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify lender is approved
    if (lender.status !== 'approved') {
      return new Response(JSON.stringify({ message: 'Lender must be approved to submit pools' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the pool and verify ownership
    const { data: pool } = await supabase
      .from('loan_pools')
      .select('id, status, lender_id')
      .eq('id', id)
      .single();

    if (!pool) {
      return new Response(JSON.stringify({ message: 'Pool not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pool.lender_id !== lender.id) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only draft pools can be submitted
    if (pool.status !== 'draft') {
      return new Response(JSON.stringify({ message: 'Only draft pools can be submitted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update pool status to submitted
    const { error } = await supabase
      .from('loan_pools')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error submitting pool:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to pool detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/lender/pools/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/lender/pools/[id]/submit:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
