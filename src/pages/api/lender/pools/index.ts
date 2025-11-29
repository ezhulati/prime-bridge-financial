import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the request body
    const body = await request.json();
    const {
      lender_id,
      pool_name,
      pool_reference,
      loan_type,
      total_loans,
      total_principal,
      total_outstanding_balance,
      weighted_avg_apr,
      weighted_avg_term_months,
      weighted_avg_fico,
      originating_bank,
    } = body;

    // Verify lender ownership
    const { data: lender } = await supabase
      .from('lenders')
      .select('id, user_id, status')
      .eq('id', lender_id)
      .single();

    if (!lender) {
      return new Response(JSON.stringify({ message: 'Lender not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the user record
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!userRecord || lender.user_id !== userRecord.id) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (lender.status !== 'approved') {
      return new Response(JSON.stringify({ message: 'Lender not approved' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the loan pool
    const { data: pool, error } = await supabase
      .from('loan_pools')
      .insert({
        lender_id,
        pool_name,
        pool_reference: pool_reference || null,
        loan_type,
        total_loans,
        total_principal,
        total_outstanding_balance,
        weighted_avg_apr,
        weighted_avg_term_months,
        weighted_avg_fico: weighted_avg_fico || null,
        originating_bank: originating_bank || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating loan pool:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(pool), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/lender/pools:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
