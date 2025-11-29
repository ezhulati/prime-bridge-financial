import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../../lib/supabase';

export const POST: APIRoute = async ({ params, request, cookies }) => {
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

    // Get form data
    const formData = await request.formData();
    const platformRiskTier = formData.get('platform_risk_tier') as string;
    const suggestedYield = formData.get('suggested_yield') as string;
    const riskAssessment = formData.get('risk_assessment') as string;

    // Validate risk tier
    const validTiers = ['A', 'B', 'C', 'D', ''];
    if (platformRiskTier && !validTiers.includes(platformRiskTier)) {
      return new Response(JSON.stringify({ message: 'Invalid risk tier' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update pool assessment
    const { error } = await supabase
      .from('loan_pools')
      .update({
        platform_risk_tier: platformRiskTier || null,
        suggested_yield: suggestedYield ? parseFloat(suggestedYield) : null,
        risk_assessment: riskAssessment || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating pool assessment:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to pool detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/pools/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/pools/[id]/assess:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
