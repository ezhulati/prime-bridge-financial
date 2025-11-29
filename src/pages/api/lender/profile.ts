import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the user record
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!userRecord) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get form data
    const formData = await request.formData();

    // Extract loan_types as array (checkboxes send multiple values)
    const loanTypes = formData.getAll('loan_types') as string[];

    // Build update object
    const updateData: Record<string, any> = {
      company_name: formData.get('company_name') as string,
      legal_entity_name: formData.get('legal_entity_name') as string || null,
      ein: formData.get('ein') as string || null,
      website: formData.get('website') as string || null,
      year_founded: formData.get('year_founded') ? parseInt(formData.get('year_founded') as string) : null,
      headquarters_state: formData.get('headquarters_state') as string || null,
      primary_contact_name: formData.get('primary_contact_name') as string,
      primary_contact_email: formData.get('primary_contact_email') as string,
      primary_contact_phone: formData.get('primary_contact_phone') as string || null,
      loan_types: loanTypes.length > 0 ? loanTypes : null,
      avg_loan_size: formData.get('avg_loan_size') ? parseFloat(formData.get('avg_loan_size') as string) : null,
      monthly_origination_volume: formData.get('monthly_origination_volume') ? parseFloat(formData.get('monthly_origination_volume') as string) : null,
      total_loans_originated: formData.get('total_loans_originated') ? parseInt(formData.get('total_loans_originated') as string) : null,
      weighted_avg_apr: formData.get('weighted_avg_apr') ? parseFloat(formData.get('weighted_avg_apr') as string) : null,
      avg_loan_term_months: formData.get('avg_loan_term_months') ? parseInt(formData.get('avg_loan_term_months') as string) : null,
      historical_default_rate: formData.get('historical_default_rate') ? parseFloat(formData.get('historical_default_rate') as string) / 100 : null,
      historical_loss_rate: formData.get('historical_loss_rate') ? parseFloat(formData.get('historical_loss_rate') as string) / 100 : null,
      avg_fico_score: formData.get('avg_fico_score') ? parseInt(formData.get('avg_fico_score') as string) : null,
      bank_partner_name: formData.get('bank_partner_name') as string || null,
      bank_partner_state: formData.get('bank_partner_state') as string || null,
      updated_at: new Date().toISOString(),
    };

    // Update the lender profile
    const { error } = await supabase
      .from('lenders')
      .update(updateData)
      .eq('user_id', userRecord.id);

    if (error) {
      console.error('Error updating lender profile:', error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to profile page
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/lender/profile' },
    });
  } catch (error) {
    console.error('Error in POST /api/lender/profile:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
