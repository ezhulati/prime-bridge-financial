import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../../lib/supabase';
import { sendLenderEmail } from '../../../../../lib/email';

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

    // Update pool status to rejected
    const { data: pool, error } = await supabase
      .from('loan_pools')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userRecord.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting pool:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!pool) {
      return new Response(JSON.stringify({ message: 'Pool not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get lender info for email
    const { data: lender } = await supabase
      .from('lenders')
      .select('user_id, company_name')
      .eq('id', pool.lender_id)
      .single();

    if (lender) {
      const { data: lenderUser } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', lender.user_id)
        .single();

      if (lenderUser) {
        sendLenderEmail('poolRejected', lenderUser.email, {
          name: lenderUser.name || lender.company_name,
          poolName: pool.name || 'Unnamed Pool',
          poolId: pool.id,
          reason: 'The pool submission requires additional information or does not meet our current criteria.',
          suggestions: [
            'Ensure loan tape includes all required fields',
            'Provide at least 6 months of historical performance data',
            'Include detailed underwriting criteria documentation',
          ],
        }).catch(err => console.error('[Admin] Failed to send pool rejection email:', err));
      }
    }

    // Redirect back to pool detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/pools/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/pools/[id]/reject:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
