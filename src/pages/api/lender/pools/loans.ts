import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../lib/supabase';

interface LoanData {
  loan_reference: string;
  borrower_state?: string;
  borrower_zip?: string;
  original_principal: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  origination_date: string;
  maturity_date?: string;
  fico_score?: number;
  dti_ratio?: number;
  monthly_payment?: number;
  payments_made?: number;
  payments_remaining?: number;
  status?: string;
  days_delinquent?: number;
}

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
    const { pool_id, loans } = body as { pool_id: string; loans: LoanData[] };

    if (!pool_id || !loans || !Array.isArray(loans)) {
      return new Response(JSON.stringify({ message: 'Missing pool_id or loans' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify pool ownership
    const { data: pool } = await supabase
      .from('loan_pools')
      .select(`
        id,
        status,
        lender:lenders!inner(
          id,
          user_id
        )
      `)
      .eq('id', pool_id)
      .single();

    if (!pool) {
      return new Response(JSON.stringify({ message: 'Pool not found' }), {
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

    const lenderData = pool.lender as unknown as { id: string; user_id: string };
    if (!userRecord || lenderData.user_id !== userRecord.id) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Can only add loans to draft pools
    if (pool.status !== 'draft') {
      return new Response(JSON.stringify({ message: 'Can only add loans to draft pools' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform and validate loans
    const loansToInsert = loans.map((loan) => ({
      loan_pool_id: pool_id,
      loan_reference: loan.loan_reference,
      borrower_state: loan.borrower_state || null,
      borrower_zip: loan.borrower_zip || null,
      original_principal: loan.original_principal,
      current_balance: loan.current_balance,
      interest_rate: loan.interest_rate,
      term_months: loan.term_months,
      origination_date: loan.origination_date,
      maturity_date: loan.maturity_date || null,
      fico_score: loan.fico_score || null,
      dti_ratio: loan.dti_ratio || null,
      monthly_payment: loan.monthly_payment || null,
      payments_made: loan.payments_made || 0,
      payments_remaining: loan.payments_remaining || null,
      status: loan.status || 'current',
      days_delinquent: loan.days_delinquent || 0,
    }));

    // Insert loans in batch
    const { data: insertedLoans, error } = await supabase
      .from('loans')
      .insert(loansToInsert)
      .select();

    if (error) {
      console.error('Error inserting loans:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update pool statistics based on imported loans
    await updatePoolStats(supabase, pool_id);

    return new Response(JSON.stringify({
      message: 'Loans imported successfully',
      count: insertedLoans?.length || 0,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/lender/pools/loans:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Update pool statistics based on imported loans
async function updatePoolStats(supabase: ReturnType<typeof createSupabaseServerClient>, poolId: string) {
  // Get aggregate stats from loans using RPC (efficient SQL calculation)
  const { data: stats, error: rpcError } = await supabase
    .rpc('get_pool_loan_stats', { pool_id_param: poolId });

  // RPC returns array with single row
  const poolStats = Array.isArray(stats) ? stats[0] : stats;

  if (poolStats && !rpcError && poolStats.total_loans > 0) {
    // Use RPC results - much faster for large pools
    await supabase
      .from('loan_pools')
      .update({
        total_loans: Number(poolStats.total_loans),
        total_principal: Number(poolStats.total_principal),
        total_outstanding_balance: Number(poolStats.total_outstanding_balance),
        weighted_avg_apr: Number(poolStats.weighted_avg_apr),
        weighted_avg_term_months: Number(poolStats.weighted_avg_term_months),
        weighted_avg_fico: poolStats.weighted_avg_fico ? Number(poolStats.weighted_avg_fico) : null,
        weighted_avg_dti: poolStats.weighted_avg_dti ? Number(poolStats.weighted_avg_dti) : null,
        weighted_avg_seasoning_months: poolStats.weighted_avg_seasoning_months ? Number(poolStats.weighted_avg_seasoning_months) : null,
        current_delinquency_rate: Number(poolStats.current_delinquency_rate),
        top_states: poolStats.top_states,
      })
      .eq('id', poolId);
  } else {
    // Fallback to manual calculation if RPC fails
    const { data: loans } = await supabase
      .from('loans')
      .select('*')
      .eq('loan_pool_id', poolId);

    if (!loans || loans.length === 0) return;

    const totalLoans = loans.length;
    const totalPrincipal = loans.reduce((sum, l) => sum + Number(l.original_principal), 0);
    const totalBalance = loans.reduce((sum, l) => sum + Number(l.current_balance), 0);

    // Weighted averages
    const weightedApr = loans.reduce((sum, l) =>
      sum + (Number(l.interest_rate) * Number(l.original_principal)), 0) / totalPrincipal;
    const weightedTerm = loans.reduce((sum, l) =>
      sum + (Number(l.term_months) * Number(l.original_principal)), 0) / totalPrincipal;

    const loansWithFico = loans.filter(l => l.fico_score);
    const weightedFico = loansWithFico.length > 0
      ? loansWithFico.reduce((sum, l) =>
        sum + (Number(l.fico_score) * Number(l.original_principal)), 0)
        / loansWithFico.reduce((sum, l) => sum + Number(l.original_principal), 0)
      : null;

    const loansWithDti = loans.filter(l => l.dti_ratio);
    const weightedDti = loansWithDti.length > 0
      ? loansWithDti.reduce((sum, l) =>
        sum + (Number(l.dti_ratio) * Number(l.original_principal)), 0)
        / loansWithDti.reduce((sum, l) => sum + Number(l.original_principal), 0)
      : null;

    // Delinquency rate (loans 30+ days past due / total loans)
    const delinquentLoans = loans.filter(l =>
      ['delinquent_30', 'delinquent_60', 'delinquent_90', 'default'].includes(l.status)
    );
    const delinquencyRate = delinquentLoans.length / totalLoans;

    // Geographic distribution
    const stateCounts: Record<string, number> = {};
    loans.forEach(l => {
      if (l.borrower_state) {
        stateCounts[l.borrower_state] = (stateCounts[l.borrower_state] || 0) + 1;
      }
    });
    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .reduce((acc, [state, count]) => ({ ...acc, [state]: count / totalLoans }), {});

    // Update pool
    await supabase
      .from('loan_pools')
      .update({
        total_loans: totalLoans,
        total_principal: totalPrincipal,
        total_outstanding_balance: totalBalance,
        weighted_avg_apr: Math.round(weightedApr * 100) / 100,
        weighted_avg_term_months: Math.round(weightedTerm),
        weighted_avg_fico: weightedFico ? Math.round(weightedFico) : null,
        weighted_avg_dti: weightedDti ? Math.round(weightedDti * 100) / 100 : null,
        current_delinquency_rate: Math.round(delinquencyRate * 10000) / 10000,
        top_states: topStates,
      })
      .eq('id', poolId);
  }
}

// GET endpoint to retrieve loans for a pool
export const GET: APIRoute = async ({ request, cookies }) => {
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

    const url = new URL(request.url);
    const poolId = url.searchParams.get('pool_id');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    if (!poolId) {
      return new Response(JSON.stringify({ message: 'Missing pool_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get loans with pagination
    const offset = (page - 1) * limit;
    const { data: loans, error, count } = await supabase
      .from('loans')
      .select('*', { count: 'exact' })
      .eq('loan_pool_id', poolId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      loans,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/lender/pools/loans:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE endpoint to clear loans from a pool
export const DELETE: APIRoute = async ({ request, cookies }) => {
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

    const url = new URL(request.url);
    const poolId = url.searchParams.get('pool_id');

    if (!poolId) {
      return new Response(JSON.stringify({ message: 'Missing pool_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify pool ownership and status
    const { data: pool } = await supabase
      .from('loan_pools')
      .select(`
        id,
        status,
        lender:lenders!inner(
          user_id
        )
      `)
      .eq('id', poolId)
      .single();

    if (!pool) {
      return new Response(JSON.stringify({ message: 'Pool not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    const lenderData = pool.lender as unknown as { user_id: string };
    if (!userRecord || lenderData.user_id !== userRecord.id) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pool.status !== 'draft') {
      return new Response(JSON.stringify({ message: 'Can only delete loans from draft pools' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete all loans
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('loan_pool_id', poolId);

    if (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Reset pool stats
    await supabase
      .from('loan_pools')
      .update({
        total_loans: 0,
        total_principal: 0,
        total_outstanding_balance: 0,
      })
      .eq('id', poolId);

    return new Response(JSON.stringify({ message: 'Loans deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in DELETE /api/lender/pools/loans:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
