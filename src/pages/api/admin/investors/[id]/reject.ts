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

    // Update investor - set approved to false (rejected)
    const { data: investor, error } = await supabase
      .from('investors')
      .update({
        approved: false,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting investor:', error);
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

    // Redirect back to investor detail page
    return new Response(null, {
      status: 302,
      headers: { 'Location': `/admin/investors/${id}` },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/investors/[id]/reject:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
