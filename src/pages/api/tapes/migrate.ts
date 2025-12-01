import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

// POST - Migrate localStorage tapes to Supabase
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { tapes } = body;

    if (!tapes || !Array.isArray(tapes) || tapes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, migrated: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform localStorage tapes to database format
    const tapesToInsert = tapes.map((tape: any) => ({
      user_id: user.id,
      name: tape.name || 'Untitled Tape',
      file_name: tape.name || 'unknown.csv',
      total_rows: tape.totalRows || 0,
      validation_score: tape.validationScore || 0,
      errors: tape.errors || 0,
      warnings: tape.warnings || 0,
      validation_data: tape.validationData || null,
      cleaned_data: null, // Don't migrate cleaned data to save space
      uploaded_at: tape.uploadedAt ? new Date(tape.uploadedAt).toISOString() : new Date().toISOString(),
    }));

    // Insert all tapes
    const { data: insertedTapes, error } = await supabase
      .from('user_tapes')
      .insert(tapesToInsert)
      .select();

    if (error) {
      console.error('Error migrating tapes:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to migrate tapes' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated: insertedTapes?.length || 0,
        tapes: insertedTapes
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tapes migrate error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
