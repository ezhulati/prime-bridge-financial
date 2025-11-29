import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../../lib/supabase';
import { sendInvestorEmail } from '../../../../../lib/email';

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

    // Update investor to approved
    const { data: investor, error } = await supabase
      .from('investors')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: userRecord.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving investor:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!investor) {
      return new Response(JSON.stringify({ message: 'Investor not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get investor's user info for email
    const { data: investorUser } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', investor.user_id)
      .single();

    // Get count of available deals for the email
    const { count: dealCount } = await supabase
      .from('loan_pools')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Send approval email to investor
    if (investorUser) {
      sendInvestorEmail('accreditationApproved', investorUser.email, {
        name: investorUser.name || 'Investor',
        availableDeals: dealCount || 0,
      }).catch(err => console.error('[Admin] Failed to send investor approval email:', err));
    }

    // Redirect back to investor detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/investors/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/investors/[id]/approve:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
