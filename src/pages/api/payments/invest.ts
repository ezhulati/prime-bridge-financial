import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../lib/supabase';
import { createInvestmentPaymentIntent, calculatePlatformFee, MIN_INVESTMENT } from '../../../lib/stripe';

// POST: Process investment payment
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const adminSupabase = createSupabaseAdminClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    // Verify user is an approved investor
    const { data: investor } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!investor || !investor.approved) {
      return new Response(JSON.stringify({ message: 'Not an approved investor' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { deal_id, amount, payment_method_id } = body;

    // Validation
    if (!deal_id || !amount || !payment_method_id) {
      return new Response(JSON.stringify({
        message: 'deal_id, amount, and payment_method_id are required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (amount < MIN_INVESTMENT) {
      return new Response(JSON.stringify({
        message: `Minimum investment is $${MIN_INVESTMENT.toLocaleString()}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the deal
    const { data: deal } = await supabase
      .from('deals')
      .select('*')
      .eq('id', deal_id)
      .single();

    if (!deal) {
      return new Response(JSON.stringify({ message: 'Deal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (deal.status !== 'published') {
      return new Response(JSON.stringify({
        message: 'Deal is not open for investment',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check minimum investment
    if (amount < deal.minimum_investment) {
      return new Response(JSON.stringify({
        message: `Minimum investment for this deal is $${deal.minimum_investment.toLocaleString()}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check available amount
    const available = deal.total_amount - deal.amount_committed;
    if (amount > available) {
      return new Response(JSON.stringify({
        message: `Only $${available.toLocaleString()} available for investment`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the payment method
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('user_id', user.id)
      .eq('status', 'verified')
      .single();

    if (!paymentMethod) {
      return new Response(JSON.stringify({
        message: 'Valid payment method not found',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create commitment record
    const { data: commitment, error: commitmentError } = await adminSupabase
      .from('deal_commitments')
      .insert({
        deal_id,
        investor_id: investor.id,
        amount,
        commitment_date: new Date().toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (commitmentError) {
      console.error('Error creating commitment:', commitmentError);
      return new Response(JSON.stringify({ message: commitmentError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Create payment intent
      const paymentIntent = await createInvestmentPaymentIntent(
        paymentMethod.stripe_customer_id!,
        paymentMethod.stripe_payment_method_id!,
        amount,
        deal_id,
        commitment.id
      );

      // Calculate fees
      const platformFee = calculatePlatformFee(amount);

      // Create transaction record
      await adminSupabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'investment',
          status: paymentIntent.status === 'succeeded' ? 'succeeded' :
                  paymentIntent.status === 'processing' ? 'processing' : 'pending',
          amount,
          fee_amount: platformFee,
          net_amount: amount - platformFee,
          stripe_payment_intent_id: paymentIntent.id,
          payment_method_id: paymentMethod.id,
          deal_id,
          commitment_id: commitment.id,
          description: `Investment in ${deal.title}`,
        });

      // Update commitment status based on payment status
      if (paymentIntent.status === 'succeeded') {
        await adminSupabase
          .from('deal_commitments')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', commitment.id);

        // Update deal committed amount
        await adminSupabase
          .from('deals')
          .update({
            amount_committed: deal.amount_committed + amount,
            investor_count: deal.investor_count + 1,
          })
          .eq('id', deal_id);

        // Update investor stats
        await adminSupabase
          .from('investors')
          .update({
            total_invested: investor.total_invested + amount,
            total_deals: investor.total_deals + 1,
          })
          .eq('id', investor.id);
      } else if (paymentIntent.status === 'processing') {
        // ACH payments take time to process
        await adminSupabase
          .from('deal_commitments')
          .update({ status: 'pending' })
          .eq('id', commitment.id);
      }

      return new Response(JSON.stringify({
        message: 'Investment initiated successfully',
        commitment_id: commitment.id,
        payment_status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (paymentError) {
      // Mark commitment as failed
      await adminSupabase
        .from('deal_commitments')
        .update({ status: 'withdrawn' })
        .eq('id', commitment.id);

      throw paymentError;
    }
  } catch (error) {
    console.error('Error in POST /api/payments/invest:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
