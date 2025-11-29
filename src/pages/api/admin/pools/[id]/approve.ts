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

    // Update pool status to approved
    const { data: pool, error } = await supabase
      .from('loan_pools')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userRecord.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving pool:', error);
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
        // Format pool size for email
        const poolSize = pool.total_amount
          ? `$${(pool.total_amount / 1000000).toFixed(1)}M`
          : 'TBD';
        const targetYield = pool.target_yield ? `${pool.target_yield}%` : 'TBD';

        sendLenderEmail('poolApproved', lenderUser.email, {
          name: lenderUser.name || lender.company_name,
          poolName: pool.name || 'Unnamed Pool',
          poolId: pool.id,
          targetYield,
          totalAmount: poolSize,
        }).catch(err => console.error('[Admin] Failed to send pool approval email:', err));
      }
    }

    // Redirect back to pool detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/pools/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/pools/[id]/approve:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
