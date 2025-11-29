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
    const kycStatus = formData.get('kyc_status') as string;

    // Validate KYC status
    const validStatuses = ['pending', 'passed', 'failed', 'review'];
    if (!validStatuses.includes(kycStatus)) {
      return new Response(JSON.stringify({ message: 'Invalid KYC status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update investor KYC status
    const updateData: Record<string, any> = {
      kyc_status: kycStatus,
    };

    // If passed, set completed at
    if (kycStatus === 'passed') {
      updateData.kyc_completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('investors')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating investor KYC:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to investor detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/investors/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/investors/[id]/kyc:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
