import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase';
import { getInquiry, mapWebhookStatus } from '../../../lib/persona';

// POST: Handle Persona webhook events
export const POST: APIRoute = async ({ request }) => {
  try {
    const adminSupabase = createSupabaseAdminClient();

    // Get the raw body for signature verification
    const rawBody = await request.text();
    const event = JSON.parse(rawBody);

    // In production, verify the webhook signature
    // const signature = request.headers.get('persona-signature');
    // const webhookSecret = import.meta.env.PERSONA_WEBHOOK_SECRET;
    // if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    //   return new Response(JSON.stringify({ message: 'Invalid signature' }), { status: 401 });
    // }

    const eventName = event.data?.attributes?.name;
    const payload = event.data?.attributes?.payload;
    const inquiryId = payload?.data?.id;

    if (!inquiryId) {
      return new Response(JSON.stringify({ message: 'No inquiry ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received Persona webhook: ${eventName} for inquiry ${inquiryId}`);

    // Get the full inquiry details
    const inquiryDetails = await getInquiry(inquiryId);

    // Map status
    const status = mapWebhookStatus(eventName);

    // Update verification record
    const { data: verification, error } = await adminSupabase
      .from('kyc_verifications')
      .update({
        status,
        completed_at: inquiryDetails.completedAt,
        first_name: inquiryDetails.firstName,
        last_name: inquiryDetails.lastName,
        date_of_birth: inquiryDetails.dateOfBirth,
        address_line1: inquiryDetails.addressLine1,
        address_city: inquiryDetails.addressCity,
        address_state: inquiryDetails.addressState,
        address_postal_code: inquiryDetails.addressPostalCode,
        id_number_last4: inquiryDetails.idNumberLast4,
        document_type: inquiryDetails.documentType,
      })
      .eq('persona_inquiry_id', inquiryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating verification:', error);
    }

    // Log activity
    if (verification) {
      await adminSupabase
        .from('activity_log')
        .insert({
          user_id: verification.user_id,
          action: `kyc_${status}`,
          entity_type: 'investor',
          details: {
            inquiry_id: inquiryId,
            event: eventName,
          },
        });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/kyc/webhook:', error);
    return new Response(JSON.stringify({
      message: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
