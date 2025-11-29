import type { APIRoute } from 'astro';
import { sendEmail, emailLayout, EMAIL_CONFIG } from '../../lib/email';

const CONTACT_EMAIL = 'enrizhulati@gmail.com';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name = formData.get('name')?.toString()?.trim();
    const email = formData.get('email')?.toString()?.trim();
    const type = formData.get('type')?.toString()?.trim();
    const company = formData.get('company')?.toString()?.trim() || 'Not provided';
    const message = formData.get('message')?.toString()?.trim();
    const botField = formData.get('bot-field')?.toString();

    // Honeypot check
    if (botField) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validation
    if (!name || !email || !type || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please fill in all required fields'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please enter a valid email address'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const typeLabels: Record<string, string> = {
      lender: 'Fintech Lender',
      investor: 'Accredited Investor',
      other: 'Other',
    };

    const subject = `[Contact] ${name} - ${typeLabels[type] || type}`;

    const html = emailLayout(`
      <h1>New Contact Form Submission</h1>

      <div class="card card-highlight">
        <p class="mb-8"><strong>From:</strong> ${name}</p>
        <p class="mb-8"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p class="mb-8"><strong>Type:</strong> ${typeLabels[type] || type}</p>
        <p class="mb-0"><strong>Company:</strong> ${company}</p>
      </div>

      <h3>Message</h3>
      <div class="card">
        <p class="mb-0" style="white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>

      <p class="text-center mb-24">
        <a href="mailto:${email}?subject=Re: Your inquiry to PrimeBridge" class="button">Reply to ${name}</a>
      </p>
    `, {
      preheader: `Contact from ${name} (${typeLabels[type] || type})`,
      showFooter: false
    });

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      subject,
      html,
      replyTo: email,
      from: EMAIL_CONFIG.from.noreply,
      tags: [
        { name: 'category', value: 'contact' },
        { name: 'type', value: type },
      ],
    });

    if (!result.success) {
      console.error('[Contact] Failed to send email:', result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send message. Please try again.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Contact] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
