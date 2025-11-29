import type { APIRoute } from 'astro';
import { createSupabaseServerClient, createSupabaseAdminClient } from '../../../../../lib/supabase';

// GET: Get bank hold for a pool
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    const { id: poolId } = params;

    if (!poolId) {
      return new Response(JSON.stringify({ message: 'Pool ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get bank hold
    const { data: bankHold } = await supabase
      .from('bank_holds')
      .select('*')
      .eq('loan_pool_id', poolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return new Response(JSON.stringify({ bank_hold: bankHold }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/lender/pools/[id]/bank-hold:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Create/submit bank hold for a pool
export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const adminSupabase = createSupabaseAdminClient();

    const { id: poolId } = params;

    if (!poolId) {
      return new Response(JSON.stringify({ message: 'Pool ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get pool and verify ownership
    const { data: pool } = await supabase
      .from('loan_pools')
      .select(`
        *,
        lender:lenders!inner(user_id, bank_partner_name, bank_partner_state)
      `)
      .eq('id', poolId)
      .single();

    if (!pool) {
      return new Response(JSON.stringify({ message: 'Pool not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lenderData = pool.lender as unknown as {
      user_id: string;
      bank_partner_name: string;
      bank_partner_state: string;
    };

    // Check authorization (lender owns pool or admin)
    if (user.role !== 'admin' && lenderData.user_id !== user.id) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      bank_name,
      bank_state,
      hold_start_date,
      hold_days = 5,
      purchase_agreement_url,
      bank_certification_url,
      hold_confirmation_number,
    } = body;

    // Validation
    if (!bank_name || !hold_start_date) {
      return new Response(JSON.stringify({
        message: 'bank_name and hold_start_date are required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate hold end date
    const startDate = new Date(hold_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + hold_days);

    // Determine initial status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status: 'pending' | 'in_progress' | 'completed' = 'pending';
    if (startDate <= today) {
      if (endDate <= today) {
        status = 'completed';
      } else {
        status = 'in_progress';
      }
    }

    // Create bank hold
    const { data: bankHold, error } = await adminSupabase
      .from('bank_holds')
      .insert({
        loan_pool_id: poolId,
        bank_name: bank_name || lenderData.bank_partner_name || 'Unknown Bank',
        bank_state: bank_state || lenderData.bank_partner_state,
        hold_start_date: hold_start_date,
        hold_end_date: endDate.toISOString().split('T')[0],
        hold_days,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        purchase_agreement_url,
        bank_certification_url,
        hold_confirmation_number,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bank hold:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log activity
    await adminSupabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: 'bank_hold_created',
        entity_type: 'loan_pool',
        entity_id: poolId,
        details: {
          bank_hold_id: bankHold.id,
          bank_name,
          hold_start_date,
          hold_days,
        },
      });

    return new Response(JSON.stringify({ bank_hold: bankHold }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/lender/pools/[id]/bank-hold:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: Update bank hold status (admin only)
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const adminSupabase = createSupabaseAdminClient();

    const { id: poolId } = params;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user and check if admin
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', authUser.email)
      .single();

    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ message: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { status, review_notes, hold_confirmation_number, bank_certification_url } = body;

    // Get existing hold
    const { data: existingHold } = await adminSupabase
      .from('bank_holds')
      .select('*')
      .eq('loan_pool_id', poolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!existingHold) {
      return new Response(JSON.stringify({ message: 'Bank hold not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update bank hold
    const updateData: Record<string, unknown> = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (review_notes !== undefined) updateData.review_notes = review_notes;
    if (hold_confirmation_number) updateData.hold_confirmation_number = hold_confirmation_number;
    if (bank_certification_url) updateData.bank_certification_url = bank_certification_url;

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: bankHold, error } = await adminSupabase
      .from('bank_holds')
      .update(updateData)
      .eq('id', existingHold.id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log activity
    await adminSupabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        action: `bank_hold_${status || 'updated'}`,
        entity_type: 'loan_pool',
        entity_id: poolId,
        details: {
          bank_hold_id: bankHold.id,
          new_status: status,
        },
      });

    return new Response(JSON.stringify({ bank_hold: bankHold }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in PUT /api/lender/pools/[id]/bank-hold:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
