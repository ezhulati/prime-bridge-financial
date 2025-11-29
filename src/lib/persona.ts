// Persona KYC Integration
// Documentation: https://docs.withpersona.com/

const PERSONA_API_URL = 'https://withpersona.com/api/v1';
const PERSONA_API_KEY = import.meta.env.PERSONA_API_KEY || '';
const PERSONA_TEMPLATE_ID = import.meta.env.PERSONA_TEMPLATE_ID || '';

interface PersonaInquiry {
  id: string;
  type: string;
  attributes: {
    status: string;
    'reference-id': string;
    'created-at': string;
    'completed-at': string | null;
    'expired-at': string | null;
  };
}

interface PersonaAccount {
  id: string;
  type: string;
  attributes: {
    'reference-id': string;
    'created-at': string;
  };
}

interface CreateInquiryResponse {
  data: PersonaInquiry;
  meta: {
    'session-token': string;
  };
}

// Create a new inquiry for KYC verification
export async function createInquiry(
  referenceId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<{ inquiryId: string; sessionToken: string }> {
  const response = await fetch(`${PERSONA_API_URL}/inquiries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERSONA_API_KEY}`,
      'Content-Type': 'application/json',
      'Persona-Version': '2023-01-05',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          'inquiry-template-id': PERSONA_TEMPLATE_ID,
          'reference-id': referenceId,
          'note': `KYC verification for ${email}`,
          'fields': {
            'email-address': email,
            ...(firstName && { 'name-first': firstName }),
            ...(lastName && { 'name-last': lastName }),
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to create inquiry');
  }

  const data: CreateInquiryResponse = await response.json();

  return {
    inquiryId: data.data.id,
    sessionToken: data.meta['session-token'],
  };
}

// Get inquiry status and details
export async function getInquiry(inquiryId: string): Promise<{
  status: string;
  completedAt: string | null;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressPostalCode?: string;
  idNumberLast4?: string;
  documentType?: string;
}> {
  const response = await fetch(`${PERSONA_API_URL}/inquiries/${inquiryId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PERSONA_API_KEY}`,
      'Persona-Version': '2023-01-05',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to get inquiry');
  }

  const data = await response.json();
  const inquiry = data.data;
  const attributes = inquiry.attributes;

  // Map Persona status to our status
  let status = 'pending';
  switch (attributes.status) {
    case 'created':
    case 'pending':
      status = 'pending';
      break;
    case 'needs_review':
      status = 'requires_review';
      break;
    case 'approved':
    case 'completed':
      status = 'passed';
      break;
    case 'declined':
    case 'failed':
      status = 'failed';
      break;
    case 'expired':
      status = 'expired';
      break;
    default:
      status = 'processing';
  }

  // Extract fields from inquiry
  const fields = attributes.fields || {};

  return {
    status,
    completedAt: attributes['completed-at'],
    firstName: fields['name-first']?.value,
    lastName: fields['name-last']?.value,
    dateOfBirth: fields['birthdate']?.value,
    addressLine1: fields['address-street-1']?.value,
    addressCity: fields['address-city']?.value,
    addressState: fields['address-subdivision']?.value,
    addressPostalCode: fields['address-postal-code']?.value,
    idNumberLast4: fields['identification-number']?.value?.slice(-4),
    documentType: attributes['document-type'],
  };
}

// Resume an existing inquiry
export async function resumeInquiry(inquiryId: string): Promise<string> {
  const response = await fetch(`${PERSONA_API_URL}/inquiries/${inquiryId}/resume`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERSONA_API_KEY}`,
      'Persona-Version': '2023-01-05',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to resume inquiry');
  }

  const data = await response.json();
  return data.meta['session-token'];
}

// List inquiries for a reference ID
export async function listInquiries(referenceId: string): Promise<PersonaInquiry[]> {
  const response = await fetch(
    `${PERSONA_API_URL}/inquiries?filter[reference-id]=${encodeURIComponent(referenceId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PERSONA_API_KEY}`,
        'Persona-Version': '2023-01-05',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to list inquiries');
  }

  const data = await response.json();
  return data.data || [];
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  // Persona uses HMAC SHA256 for webhook signatures
  // This is a simplified version - in production use proper crypto
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

// Map verification status from Persona webhook event
export function mapWebhookStatus(eventName: string): string {
  switch (eventName) {
    case 'inquiry.created':
      return 'initiated';
    case 'inquiry.started':
    case 'inquiry.pending':
      return 'processing';
    case 'inquiry.completed':
    case 'inquiry.approved':
      return 'passed';
    case 'inquiry.failed':
    case 'inquiry.declined':
      return 'failed';
    case 'inquiry.expired':
      return 'expired';
    case 'inquiry.marked-for-review':
      return 'requires_review';
    default:
      return 'processing';
  }
}
