import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../lib/supabase';
import {
  getOrCreateStripeCustomer,
  createBankAccountFromFinancialConnections,
  listCustomerPaymentMethods,
  detachPaymentMethod,
  getPaymentMethodDetails
} from '../../../lib/stripe';

// GET: List user's payment methods
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

    // Get payment methods from database
    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'removed')
      .order('is_default', { ascending: false });

    return new Response(JSON.stringify({ payment_methods: paymentMethods || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/payments/methods:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Add payment method from Financial Connections
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

    const body = await request.json();
    const { financial_connections_account_id, set_default } = body;

    if (!financial_connections_account_id) {
      return new Response(JSON.stringify({ message: 'financial_connections_account_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.name || user.email
    );

    // Create payment method from Financial Connections account
    const paymentMethod = await createBankAccountFromFinancialConnections(
      stripeCustomerId,
      financial_connections_account_id
    );

    const bankAccount = paymentMethod.us_bank_account;

    // If setting as default, remove default from other methods
    if (set_default) {
      await adminSupabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Check if this is the first payment method
    const { count } = await adminSupabase
      .from('payment_methods')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'removed');

    const isFirstMethod = (count || 0) === 0;

    // Save to database
    const { data: savedMethod, error } = await adminSupabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_method_id: paymentMethod.id,
        bank_name: bankAccount?.bank_name || 'Unknown Bank',
        account_type: bankAccount?.account_type || 'checking',
        last_four: bankAccount?.last4 || '****',
        routing_last_four: bankAccount?.routing_number?.slice(-4) || '****',
        status: 'verified', // Financial Connections provides instant verification
        verified_at: new Date().toISOString(),
        verification_method: 'instant',
        is_default: set_default || isFirstMethod,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving payment method:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ payment_method: savedMethod }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/payments/methods:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Remove payment method
export const DELETE: APIRoute = async ({ request, cookies }) => {
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
      .select('id')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const methodId = url.searchParams.get('id');

    if (!methodId) {
      return new Response(JSON.stringify({ message: 'Payment method ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the payment method
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .eq('user_id', user.id)
      .single();

    if (!paymentMethod) {
      return new Response(JSON.stringify({ message: 'Payment method not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Detach from Stripe
    if (paymentMethod.stripe_payment_method_id) {
      try {
        await detachPaymentMethod(paymentMethod.stripe_payment_method_id);
      } catch {
        // Ignore errors - payment method may already be detached
      }
    }

    // Mark as removed in database
    await adminSupabase
      .from('payment_methods')
      .update({ status: 'removed' })
      .eq('id', methodId);

    // If this was the default, make another one default
    if (paymentMethod.is_default) {
      const { data: otherMethods } = await adminSupabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .neq('status', 'removed')
        .limit(1);

      if (otherMethods && otherMethods.length > 0) {
        await adminSupabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', otherMethods[0].id);
      }
    }

    return new Response(JSON.stringify({ message: 'Payment method removed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in DELETE /api/payments/methods:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
