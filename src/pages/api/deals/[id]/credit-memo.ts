import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../../lib/supabase';
import { generateCreditMemo, getCreditMemoFilename } from '../../../../lib/creditMemo';

// GET: Generate and download credit memo PDF
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const adminSupabase = createSupabaseAdminClient();

    const { id: dealId } = params;

    if (!dealId) {
      return new Response(JSON.stringify({ message: 'Deal ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check authentication
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user and check if they're an approved investor or admin
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

    // If not admin, verify investor is approved
    if (user.role !== 'admin') {
      const { data: investor } = await supabase
        .from('investors')
        .select('approved')
        .eq('user_id', user.id)
        .single();

      if (!investor?.approved) {
        return new Response(JSON.stringify({ message: 'Not authorized to view credit memos' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get deal with loan pool and lender
    const { data: deal } = await adminSupabase
      .from('deals')
      .select(`
        *,
        loan_pool:loan_pools!inner(*),
        lender:lenders!inner(*)
      `)
      .eq('id', dealId)
      .single();

    if (!deal) {
      return new Response(JSON.stringify({ message: 'Deal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only allow viewing published deals (or all for admin)
    if (user.role !== 'admin' && !['published', 'fully_committed', 'funding', 'funded', 'performing'].includes(deal.status)) {
      return new Response(JSON.stringify({ message: 'Deal not available' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get loan statistics
    const { data: loans } = await adminSupabase
      .from('loans')
      .select('fico_score, borrower_state, status, original_principal')
      .eq('loan_pool_id', deal.loan_pool_id);

    let loanStats;
    if (loans && loans.length > 0) {
      // FICO distribution
      const ficoDistribution: Record<string, number> = {};
      loans.forEach(loan => {
        if (loan.fico_score) {
          let bucket = 'Unknown';
          if (loan.fico_score >= 750) bucket = '750+';
          else if (loan.fico_score >= 700) bucket = '700-749';
          else if (loan.fico_score >= 650) bucket = '650-699';
          else if (loan.fico_score >= 600) bucket = '600-649';
          else bucket = '<600';
          ficoDistribution[bucket] = (ficoDistribution[bucket] || 0) + 1;
        }
      });

      // State distribution
      const stateDistribution: Record<string, number> = {};
      loans.forEach(loan => {
        if (loan.borrower_state) {
          stateDistribution[loan.borrower_state] = (stateDistribution[loan.borrower_state] || 0) + 1;
        }
      });

      // Status distribution
      const statusDistribution: Record<string, number> = {};
      loans.forEach(loan => {
        statusDistribution[loan.status] = (statusDistribution[loan.status] || 0) + 1;
      });

      // Convert to percentages
      const total = loans.length;
      Object.keys(ficoDistribution).forEach(k => ficoDistribution[k] /= total);
      Object.keys(stateDistribution).forEach(k => stateDistribution[k] /= total);
      Object.keys(statusDistribution).forEach(k => statusDistribution[k] /= total);

      // Average loan size
      const avgLoanSize = loans.reduce((sum, l) => sum + Number(l.original_principal), 0) / total;

      loanStats = {
        ficoDistribution,
        stateDistribution,
        statusDistribution,
        avgLoanSize,
      };
    }

    // Generate PDF
    const pdfBuffer = await generateCreditMemo({
      deal: deal as any,
      loanPool: deal.loan_pool as any,
      lender: deal.lender as any,
      loanStats,
    });

    // Return PDF
    const filename = getCreditMemoFilename(deal.title);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating credit memo:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Failed to generate credit memo',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
