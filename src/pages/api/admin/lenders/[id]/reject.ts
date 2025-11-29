import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../../../lib/supabase';

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

    // Update lender status to rejected
    const { data: lender, error } = await supabase
      .from('lenders')
      .update({
        status: 'rejected',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting lender:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!lender) {
      return new Response(JSON.stringify({ message: 'Lender not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to lender detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/lenders/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/lenders/[id]/reject:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
