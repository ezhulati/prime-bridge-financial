import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { getOrCreateStripeCustomer, createFinancialConnectionsSession } from '../../../lib/stripe';

// POST: Create Stripe customer and Financial Connections session
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

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

    const body = await request.json();
    const { return_url } = body;

    if (!return_url) {
      return new Response(JSON.stringify({ message: 'return_url is required' }), {
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

    // Create Financial Connections session
    const session = await createFinancialConnectionsSession(
      stripeCustomerId,
      return_url
    );

    return new Response(JSON.stringify({
      client_secret: session.client_secret,
      customer_id: stripeCustomerId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/payments/setup:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
