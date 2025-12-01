import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

// DELETE - Delete a tape
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Tape ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete tape (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('user_tapes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting tape:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to delete tape' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tape DELETE error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
