import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import {
  sendLenderEmail,
  sendInvestorEmail,
  sendAdminEmail,
  sendTransactionalEmail,
} from '../../../lib/email';

// Admin emails for notifications
const ADMIN_EMAILS = ['admin@primebridge.finance']; // Update with real admin emails

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();

    // Require authentication for non-transactional emails
    const body = await request.json();
    const { category, template, to, data } = body;

    if (!category || !template || !to || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: category, template, to, data' }),
        { status: 400 }
      );
    }

    // Transactional emails (password reset, verification) don't require auth
    const isTransactional = category === 'transactional' &&
      ['emailVerification', 'passwordReset'].includes(template);

    if (!isTransactional && !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    let result;

    switch (category) {
      case 'lender':
        result = await sendLenderEmail(template, to, data);
        break;
      case 'investor':
        result = await sendInvestorEmail(template, to, data);
        break;
      case 'admin':
        result = await sendAdminEmail(template, to, data);
        break;
      case 'transactional':
        result = await sendTransactionalEmail(template, to, data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid category' }),
          { status: 400 }
        );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Email send error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
