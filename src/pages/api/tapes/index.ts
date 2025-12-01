import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

// GET - List user's tapes
export const GET: APIRoute = async ({ cookies }) => {
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

    // Get user's tapes
    const { data: tapes, error } = await supabase
      .from('user_tapes')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching tapes:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tapes' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ tapes: tapes || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tapes GET error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create a new tape
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
    const { name, fileName, totalRows, validationScore, errors, warnings, validationData, cleanedData } = body;

    // Validate required fields
    if (!name || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Name and fileName are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert tape
    const { data: tape, error } = await supabase
      .from('user_tapes')
      .insert({
        user_id: user.id,
        name,
        file_name: fileName,
        total_rows: totalRows || 0,
        validation_score: validationScore || 0,
        errors: errors || 0,
        warnings: warnings || 0,
        validation_data: validationData || null,
        cleaned_data: cleanedData || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tape:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save tape' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, tape }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tapes POST error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
