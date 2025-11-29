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

    // Verify admin role
    const { data: userRecord } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user.email)
      .single();

    if (!userRecord || userRecord.role !== 'admin') {
      return new Response(JSON.stringify({ message: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the request body
    const body = await request.json();
    const {
      loan_pool_id,
      lender_id,
      title,
      description,
      total_amount,
      minimum_investment,
      target_yield,
      term_months,
      payment_frequency,
      risk_tier,
      loan_type,
      total_loans,
      weighted_avg_fico,
      expected_loss,
      platform_fee_percent,
      servicing_fee_percent,
      created_by,
    } = body;

    // Verify pool exists and is approved
    const { data: pool } = await supabase
      .from('loan_pools')
      .select('id, status')
      .eq('id', loan_pool_id)
      .single();

    if (!pool) {
      return new Response(JSON.stringify({ message: 'Loan pool not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pool.status !== 'approved') {
      return new Response(JSON.stringify({ message: 'Loan pool must be approved before creating a deal' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if deal already exists for this pool
    const { data: existingDeal } = await supabase
      .from('deals')
      .select('id')
      .eq('loan_pool_id', loan_pool_id)
      .single();

    if (existingDeal) {
      return new Response(JSON.stringify({ message: 'A deal already exists for this loan pool' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        loan_pool_id,
        lender_id,
        title,
        description: description || null,
        total_amount,
        minimum_investment,
        target_yield,
        term_months,
        payment_frequency,
        risk_tier,
        loan_type,
        total_loans,
        weighted_avg_fico: weighted_avg_fico || null,
        expected_loss: expected_loss || null,
        amount_committed: 0,
        amount_funded: 0,
        investor_count: 0,
        status: 'draft',
        platform_fee_percent,
        servicing_fee_percent,
        created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deal:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the loan pool status to 'converted'
    await supabase
      .from('loan_pools')
      .update({ status: 'converted' })
      .eq('id', loan_pool_id);

    return new Response(JSON.stringify(deal), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/deals:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
