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
    const { deal_id, investor_id, amount } = body;

    if (!deal_id || !investor_id || !amount) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify investor ownership
    const { data: investor } = await supabase
      .from('investors')
      .select('id, user_id, approved')
      .eq('id', investor_id)
      .single();

    if (!investor) {
      return new Response(JSON.stringify({ message: 'Investor not found' }), {
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

    if (!userRecord || investor.user_id !== userRecord.id) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!investor.approved) {
      return new Response(JSON.stringify({ message: 'Investor not approved' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the deal
    const { data: deal } = await supabase
      .from('deals')
      .select('id, status, minimum_investment, total_amount, amount_committed')
      .eq('id', deal_id)
      .single();

    if (!deal) {
      return new Response(JSON.stringify({ message: 'Deal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (deal.status !== 'published') {
      return new Response(JSON.stringify({ message: 'Deal is not open for commitments' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate amount
    if (amount < deal.minimum_investment) {
      return new Response(JSON.stringify({ message: `Minimum investment is $${deal.minimum_investment.toLocaleString()}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const remainingAmount = deal.total_amount - deal.amount_committed;
    if (amount > remainingAmount) {
      return new Response(JSON.stringify({ message: `Maximum available is $${remainingAmount.toLocaleString()}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for existing commitment
    const { data: existingCommitment } = await supabase
      .from('deal_commitments')
      .select('id')
      .eq('deal_id', deal_id)
      .eq('investor_id', investor_id)
      .single();

    if (existingCommitment) {
      return new Response(JSON.stringify({ message: 'You already have a commitment to this deal' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the commitment
    const { data: commitment, error } = await supabase
      .from('deal_commitments')
      .insert({
        deal_id,
        investor_id,
        amount,
        commitment_date: new Date().toISOString(),
        status: 'pending',
        principal_returned: 0,
        interest_earned: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating commitment:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update deal's amount_committed and investor_count
    const { error: updateError } = await supabase
      .from('deals')
      .update({
        amount_committed: deal.amount_committed + amount,
        investor_count: deal.investor_count + 1,
      })
      .eq('id', deal_id);

    if (updateError) {
      console.error('Error updating deal:', updateError);
    }

    // Check if deal is now fully committed
    const newAmountCommitted = deal.amount_committed + amount;
    if (newAmountCommitted >= deal.total_amount) {
      await supabase
        .from('deals')
        .update({ status: 'fully_committed' })
        .eq('id', deal_id);
    }

    return new Response(JSON.stringify(commitment), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/investor/commitments:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
