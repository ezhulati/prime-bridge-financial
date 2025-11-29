import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_CONFIG = {
  from: {
    default: 'PrimeBridge <hello@primebridge.finance>',
    noreply: 'PrimeBridge <noreply@primebridge.finance>',
    deals: 'PrimeBridge Deals <deals@primebridge.finance>',
    support: 'PrimeBridge Support <support@primebridge.finance>',
  },
  replyTo: 'support@primebridge.finance',
  baseUrl: import.meta.env.PUBLIC_SITE_URL || 'https://primebridge.finance',
};

// Types for email sending
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || EMAIL_CONFIG.from.default,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Send batch emails (up to 100 at a time)
 */
export async function sendBatchEmails(
  emails: SendEmailOptions[]
): Promise<{ success: boolean; results: EmailResult[] }> {
  try {
    const { data, error } = await resend.batch.send(
      emails.map(email => ({
        from: email.from || EMAIL_CONFIG.from.default,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: email.replyTo || EMAIL_CONFIG.replyTo,
        tags: email.tags,
      }))
    );

    if (error) {
      console.error('[Email] Batch send failed:', error);
      return {
        success: false,
        results: [{ success: false, error: error.message }]
      };
    }

    return {
      success: true,
      results: data?.data?.map(d => ({ success: true, id: d.id })) || [],
    };
  } catch (err) {
    console.error('[Email] Batch exception:', err);
    return {
      success: false,
      results: [{
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }],
    };
  }
}

// ============================================================
// EMAIL TEMPLATE HELPERS
// ============================================================

/**
 * Generate the base email layout wrapper
 */
export function emailLayout(content: string, options?: {
  preheader?: string;
  showFooter?: boolean;
}): string {
  const preheader = options?.preheader || '';
  const showFooter = options?.showFooter !== false;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>PrimeBridge</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a2e;
      background-color: #f5f5f7;
    }
    .wrapper {
      width: 100%;
      background-color: #f5f5f7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #1B365D;
      padding: 32px 40px;
      text-align: center;
    }
    .header img {
      height: 40px;
      width: auto;
    }
    .header-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 0 0 8px;
      font-size: 13px;
      color: #6c757d;
    }
    .footer a {
      color: #1B365D;
      text-decoration: none;
    }
    h1, h2, h3 {
      color: #1B365D;
      margin-top: 0;
      line-height: 1.3;
    }
    h1 { font-size: 28px; margin-bottom: 16px; }
    h2 { font-size: 22px; margin-bottom: 12px; }
    h3 { font-size: 18px; margin-bottom: 8px; }
    p { margin: 0 0 16px; }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #1B365D;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #152a4a;
    }
    .button-secondary {
      background-color: #ffffff;
      color: #1B365D !important;
      border: 2px solid #1B365D;
    }
    .button-secondary:hover {
      background-color: #f8f9fa;
    }
    .card {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .card-highlight {
      background-color: #e8f4f8;
      border-left: 4px solid #1B365D;
    }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 24px 0;
    }
    .text-muted {
      color: #6c757d;
      font-size: 14px;
    }
    .text-small {
      font-size: 13px;
    }
    .text-center {
      text-align: center;
    }
    .mb-0 { margin-bottom: 0; }
    .mb-8 { margin-bottom: 8px; }
    .mb-16 { margin-bottom: 16px; }
    .mb-24 { margin-bottom: 24px; }
    .mb-32 { margin-bottom: 32px; }
    .stat-grid {
      display: table;
      width: 100%;
      margin: 24px 0;
    }
    .stat-item {
      display: table-cell;
      text-align: center;
      padding: 16px;
      border-right: 1px solid #e9ecef;
    }
    .stat-item:last-child {
      border-right: none;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1B365D;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 13px;
      color: #6c757d;
      margin-top: 4px;
    }
    .list-item {
      padding: 12px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success {
      background-color: #d4edda;
      color: #155724;
    }
    .badge-warning {
      background-color: #fff3cd;
      color: #856404;
    }
    .badge-info {
      background-color: #d1ecf1;
      color: #0c5460;
    }
    .badge-danger {
      background-color: #f8d7da;
      color: #721c24;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      opacity: 0;
      color: transparent;
      height: 0;
      width: 0;
      max-height: 0;
      max-width: 0;
      overflow: hidden;
      mso-hide: all;
    }
    @media only screen and (max-width: 600px) {
      .wrapper {
        padding: 20px 12px;
      }
      .content, .header, .footer {
        padding: 24px 20px;
      }
      h1 { font-size: 24px; }
      .stat-grid {
        display: block;
      }
      .stat-item {
        display: block;
        border-right: none;
        border-bottom: 1px solid #e9ecef;
        padding: 12px 0;
      }
      .stat-item:last-child {
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<span class="preheader">${preheader}</span>` : ''}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="header-text">PrimeBridge</span>
      </div>
      <div class="content">
        ${content}
      </div>
      ${showFooter ? `
      <div class="footer">
        <p>
          <a href="${EMAIL_CONFIG.baseUrl}">Website</a> &nbsp;|&nbsp;
          <a href="${EMAIL_CONFIG.baseUrl}/contact">Contact</a> &nbsp;|&nbsp;
          <a href="mailto:${EMAIL_CONFIG.replyTo}">Support</a>
        </p>
        <p class="text-small">
          PrimeBridge Finance<br>
          Private credit marketplace for fintech lenders and accredited investors
        </p>
        <p class="text-small text-muted">
          You're receiving this email because you have an account with PrimeBridge.<br>
          <a href="${EMAIL_CONFIG.baseUrl}/unsubscribe">Unsubscribe</a> from marketing emails
        </p>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================
// LENDER EMAIL TEMPLATES
// ============================================================

export const lenderEmails = {
  /**
   * Welcome email when a lender registers
   */
  welcome(data: {
    name: string;
    companyName?: string;
  }): { subject: string; html: string } {
    const subject = 'Welcome to PrimeBridge - Let\'s fund your growth';
    const html = emailLayout(`
      <h1>Welcome to PrimeBridge, ${data.name}!</h1>
      <p>
        You've taken the first step toward connecting your loan portfolio with institutional capital.
        PrimeBridge gives you direct access to accredited investors looking for exactly what you offer:
        transparent, high-yield loan pools.
      </p>

      <div class="card">
        <h3 class="mb-8">What happens next?</h3>
        <p class="mb-0">
          <strong>1. Complete your lender profile</strong> - Tell us about your company and lending history<br><br>
          <strong>2. Submit your first pool</strong> - Upload your loan tape and pool details<br><br>
          <strong>3. Get matched with investors</strong> - We'll connect you with qualified capital
        </p>
      </div>

      <p class="text-center mb-32">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/dashboard" class="button">Go to your dashboard</a>
      </p>

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions? Reply to this email or reach out to our team at
        <a href="mailto:${EMAIL_CONFIG.replyTo}">${EMAIL_CONFIG.replyTo}</a>
      </p>
    `, { preheader: 'Welcome to PrimeBridge - Let\'s connect you with institutional capital' });

    return { subject, html };
  },

  /**
   * Pool submitted confirmation
   */
  poolSubmitted(data: {
    name: string;
    poolName: string;
    poolId: string;
    totalAmount: string;
    assetClass: string;
  }): { subject: string; html: string } {
    const subject = `Pool submitted: ${data.poolName}`;
    const html = emailLayout(`
      <h1>Pool submitted successfully</h1>
      <p>Hi ${data.name},</p>
      <p>
        Your loan pool has been submitted and is now under review by our team.
        We'll analyze the loan tape and pool characteristics to prepare it for investor viewing.
      </p>

      <div class="card card-highlight">
        <h3 class="mb-16">${data.poolName}</h3>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${data.totalAmount}</div>
            <div class="stat-label">Pool Size</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.assetClass}</div>
            <div class="stat-label">Asset Class</div>
          </div>
        </div>
        <p class="text-muted mb-0">
          <span class="badge badge-info">Under Review</span>
        </p>
      </div>

      <p>
        <strong>What happens next:</strong>
      </p>
      <ul>
        <li>Our team reviews your loan tape and documentation (1-2 business days)</li>
        <li>We may reach out for additional information if needed</li>
        <li>Once approved, your pool goes live in the investor deal room</li>
        <li>You'll be notified as investors express interest</li>
      </ul>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/pools/${data.poolId}" class="button">View pool details</a>
      </p>
    `, { preheader: `Your pool "${data.poolName}" is now under review` });

    return { subject, html };
  },

  /**
   * Pool approved and published
   */
  poolApproved(data: {
    name: string;
    poolName: string;
    poolId: string;
    targetYield: string;
    totalAmount: string;
  }): { subject: string; html: string } {
    const subject = `Your pool is live: ${data.poolName}`;
    const html = emailLayout(`
      <h1>Your pool is now live!</h1>
      <p>Hi ${data.name},</p>
      <p>
        Great news! Your loan pool has been approved and is now visible to our network of
        accredited investors. You'll receive notifications as investors express interest.
      </p>

      <div class="card" style="background-color: #d4edda; border-left: 4px solid #28a745;">
        <h3 class="mb-16">${data.poolName}</h3>
        <div class="stat-grid">
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.totalAmount}</div>
            <div class="stat-label">Pool Size</div>
          </div>
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.targetYield}</div>
            <div class="stat-label">Target Yield</div>
          </div>
        </div>
        <p class="mb-0">
          <span class="badge badge-success">Live</span>
        </p>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/pools/${data.poolId}" class="button">View pool dashboard</a>
      </p>

      <p class="text-muted">
        Tip: Share your pool link directly with investors you know. The more visibility,
        the faster you'll reach your funding goal.
      </p>
    `, { preheader: `"${data.poolName}" is now live and visible to investors` });

    return { subject, html };
  },

  /**
   * Pool rejected
   */
  poolRejected(data: {
    name: string;
    poolName: string;
    poolId: string;
    reason: string;
    suggestions?: string[];
  }): { subject: string; html: string } {
    const subject = `Pool review update: ${data.poolName}`;
    const html = emailLayout(`
      <h1>Pool review update</h1>
      <p>Hi ${data.name},</p>
      <p>
        After reviewing your loan pool submission, we're unable to approve it for the investor
        deal room at this time. Here's the feedback from our review:
      </p>

      <div class="card" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
        <h3 class="mb-8">${data.poolName}</h3>
        <p class="mb-0"><strong>Review notes:</strong> ${data.reason}</p>
      </div>

      ${data.suggestions && data.suggestions.length > 0 ? `
      <p><strong>Suggestions to improve your submission:</strong></p>
      <ul>
        ${data.suggestions.map(s => `<li>${s}</li>`).join('')}
      </ul>
      ` : ''}

      <p>
        You can update your pool and resubmit for review. If you have questions about the
        feedback, please reach out to our team.
      </p>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/pools/${data.poolId}/edit" class="button">Update pool</a>
      </p>

      <p class="text-muted text-center">
        Need help? <a href="mailto:${EMAIL_CONFIG.replyTo}">Contact our team</a>
      </p>
    `, { preheader: `Action needed: Your pool "${data.poolName}" needs updates` });

    return { subject, html };
  },

  /**
   * New investor interest notification
   */
  investorInterest(data: {
    name: string;
    poolName: string;
    poolId: string;
    investorCount: number;
    totalInterest: string;
  }): { subject: string; html: string } {
    const subject = `New investor interest in ${data.poolName}`;
    const html = emailLayout(`
      <h1>Investors are interested!</h1>
      <p>Hi ${data.name},</p>
      <p>
        Your loan pool is generating interest from accredited investors on PrimeBridge.
      </p>

      <div class="card card-highlight">
        <h3 class="mb-16">${data.poolName}</h3>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${data.investorCount}</div>
            <div class="stat-label">Interested Investors</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.totalInterest}</div>
            <div class="stat-label">Total Interest</div>
          </div>
        </div>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/pools/${data.poolId}" class="button">View investor details</a>
      </p>
    `, { preheader: `${data.investorCount} investor(s) interested in your pool` });

    return { subject, html };
  },

  /**
   * Commitment received
   */
  commitmentReceived(data: {
    name: string;
    poolName: string;
    poolId: string;
    investorName: string;
    commitmentAmount: string;
    totalCommitted: string;
    targetAmount: string;
    percentFunded: number;
  }): { subject: string; html: string } {
    const subject = `New commitment: ${data.commitmentAmount} for ${data.poolName}`;
    const html = emailLayout(`
      <h1>New commitment received!</h1>
      <p>Hi ${data.name},</p>
      <p>
        An investor has committed capital to your loan pool.
      </p>

      <div class="card" style="background-color: #d4edda;">
        <p class="mb-8"><strong>Investor:</strong> ${data.investorName}</p>
        <p class="mb-0"><strong>Commitment:</strong> ${data.commitmentAmount}</p>
      </div>

      <div class="card card-highlight">
        <h3 class="mb-16">${data.poolName}</h3>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${data.totalCommitted}</div>
            <div class="stat-label">Total Committed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.targetAmount}</div>
            <div class="stat-label">Target</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.percentFunded}%</div>
            <div class="stat-label">Funded</div>
          </div>
        </div>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/pools/${data.poolId}" class="button">View pool dashboard</a>
      </p>
    `, { preheader: `${data.investorName} committed ${data.commitmentAmount} to your pool` });

    return { subject, html };
  },

  /**
   * Pool fully funded
   */
  poolFunded(data: {
    name: string;
    poolName: string;
    poolId: string;
    totalFunded: string;
    investorCount: number;
  }): { subject: string; html: string } {
    const subject = `Congratulations! ${data.poolName} is fully funded`;
    const html = emailLayout(`
      <h1>Your pool is fully funded!</h1>
      <p>Hi ${data.name},</p>
      <p>
        Congratulations! Your loan pool has reached its funding goal. Our team will be in touch
        to coordinate the closing process and capital transfer.
      </p>

      <div class="card" style="background-color: #d4edda; border-left: 4px solid #28a745; text-align: center;">
        <h3 class="mb-16">${data.poolName}</h3>
        <div class="stat-grid">
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.totalFunded}</div>
            <div class="stat-label">Total Funded</div>
          </div>
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.investorCount}</div>
            <div class="stat-label">Investors</div>
          </div>
        </div>
        <p class="mb-0">
          <span class="badge badge-success">Fully Funded</span>
        </p>
      </div>

      <p><strong>Next steps:</strong></p>
      <ul>
        <li>Our team will send you closing documents within 24 hours</li>
        <li>Coordinate wire instructions with investors</li>
        <li>Set up reporting and servicing requirements</li>
      </ul>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/lender/pools/${data.poolId}" class="button">View pool details</a>
      </p>
    `, { preheader: `Congratulations! Your pool is fully funded with ${data.totalFunded}` });

    return { subject, html };
  },
};

// ============================================================
// INVESTOR EMAIL TEMPLATES
// ============================================================

export const investorEmails = {
  /**
   * Welcome email when an investor registers
   */
  welcome(data: {
    name: string;
  }): { subject: string; html: string } {
    const subject = 'Welcome to PrimeBridge - Private credit investing reimagined';
    const html = emailLayout(`
      <h1>Welcome to PrimeBridge, ${data.name}!</h1>
      <p>
        You're one step closer to accessing direct loan pools from vetted fintech lenders.
        No fund fees, no black boxes — just transparent, high-yield private credit opportunities.
      </p>

      <div class="card">
        <h3 class="mb-8">What happens next?</h3>
        <p class="mb-0">
          <strong>1. Complete accreditation</strong> - Verify your investor status (required for deal access)<br><br>
          <strong>2. Access the deal room</strong> - Browse available loan pools with full transparency<br><br>
          <strong>3. Invest directly</strong> - Commit to pools that match your criteria
        </p>
      </div>

      <p class="text-center mb-32">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/dashboard" class="button">Complete your profile</a>
      </p>

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions? Reply to this email or reach out at
        <a href="mailto:${EMAIL_CONFIG.replyTo}">${EMAIL_CONFIG.replyTo}</a>
      </p>
    `, { preheader: 'Welcome to PrimeBridge - Complete your accreditation to access deals' });

    return { subject, html };
  },

  /**
   * Accreditation submitted / pending review
   */
  accreditationPending(data: {
    name: string;
  }): { subject: string; html: string } {
    const subject = 'Accreditation submitted - We\'re reviewing your application';
    const html = emailLayout(`
      <h1>Accreditation under review</h1>
      <p>Hi ${data.name},</p>
      <p>
        Thanks for submitting your accreditation verification. Our team is reviewing your
        documentation and will get back to you within 1-2 business days.
      </p>

      <div class="card card-highlight">
        <p class="mb-8"><strong>Status:</strong> <span class="badge badge-warning">Under Review</span></p>
        <p class="mb-0 text-muted">
          We'll email you as soon as your accreditation is verified and you have full access
          to the investor deal room.
        </p>
      </div>

      <p>
        While you wait, you can explore our platform and learn about the types of loan pools
        available on PrimeBridge.
      </p>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/investors" class="button">Learn about our deals</a>
      </p>
    `, { preheader: 'Your accreditation is under review - we\'ll be in touch soon' });

    return { subject, html };
  },

  /**
   * Accreditation approved
   */
  accreditationApproved(data: {
    name: string;
    availableDeals?: number;
  }): { subject: string; html: string } {
    const subject = 'You\'re approved! Access the PrimeBridge deal room';
    const html = emailLayout(`
      <h1>You're approved!</h1>
      <p>Hi ${data.name},</p>
      <p>
        Your accreditation has been verified. You now have full access to the PrimeBridge
        investor deal room, where you can browse and commit to loan pools from our network
        of vetted fintech lenders.
      </p>

      <div class="card" style="background-color: #d4edda; border-left: 4px solid #28a745;">
        <p class="mb-8"><strong>Status:</strong> <span class="badge badge-success">Verified Investor</span></p>
        ${data.availableDeals ? `
        <p class="mb-0">
          <strong>${data.availableDeals} active deals</strong> are currently available in the deal room.
        </p>
        ` : ''}
      </div>

      <p class="text-center mb-32">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/deals" class="button">Browse deals</a>
      </p>

      <div class="divider"></div>

      <p class="text-muted">
        <strong>What you'll find in each deal:</strong>
      </p>
      <ul class="text-muted">
        <li>Full loan tape with borrower-level data</li>
        <li>FICO distributions and credit analysis</li>
        <li>Historical performance metrics</li>
        <li>Servicing and underwriting details</li>
        <li>Legal structure and documentation</li>
      </ul>
    `, { preheader: 'Your accreditation is verified - start browsing deals now' });

    return { subject, html };
  },

  /**
   * Accreditation rejected
   */
  accreditationRejected(data: {
    name: string;
    reason: string;
    canReapply: boolean;
  }): { subject: string; html: string } {
    const subject = 'Accreditation update - Additional information needed';
    const html = emailLayout(`
      <h1>Accreditation update</h1>
      <p>Hi ${data.name},</p>
      <p>
        We've reviewed your accreditation submission and need additional information to
        verify your investor status.
      </p>

      <div class="card" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
        <p class="mb-0"><strong>Review notes:</strong> ${data.reason}</p>
      </div>

      ${data.canReapply ? `
      <p>
        You can update your documentation and resubmit for review. Our team is happy to help
        if you have questions about the verification requirements.
      </p>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/dashboard" class="button">Update documentation</a>
      </p>
      ` : ''}

      <p class="text-muted text-center">
        Questions? <a href="mailto:${EMAIL_CONFIG.replyTo}">Contact our team</a>
      </p>
    `, { preheader: 'Action needed: Additional documentation required for accreditation' });

    return { subject, html };
  },

  /**
   * New deal available
   */
  newDealAvailable(data: {
    name: string;
    dealName: string;
    dealId: string;
    assetClass: string;
    targetYield: string;
    poolSize: string;
    duration: string;
    lenderName: string;
  }): { subject: string; html: string } {
    const subject = `New deal: ${data.targetYield} yield on ${data.assetClass}`;
    const html = emailLayout(`
      <h1>New deal available</h1>
      <p>Hi ${data.name},</p>
      <p>
        A new loan pool matching your investment criteria is now available in the deal room.
      </p>

      <div class="card card-highlight">
        <h3 class="mb-8">${data.dealName}</h3>
        <p class="mb-16 text-muted">by ${data.lenderName}</p>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${data.targetYield}</div>
            <div class="stat-label">Target Yield</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.poolSize}</div>
            <div class="stat-label">Pool Size</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.duration}</div>
            <div class="stat-label">Duration</div>
          </div>
        </div>
        <p class="mb-0">
          <span class="badge badge-info">${data.assetClass}</span>
        </p>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/deals/${data.dealId}" class="button">View deal details</a>
      </p>

      <p class="text-muted text-small">
        Access the full loan tape, FICO distributions, historical performance, and legal
        documentation in the deal room.
      </p>
    `, { preheader: `New ${data.assetClass} deal: ${data.targetYield} yield, ${data.poolSize} pool` });

    return { subject, html };
  },

  /**
   * Commitment confirmed
   */
  commitmentConfirmed(data: {
    name: string;
    dealName: string;
    dealId: string;
    commitmentAmount: string;
    expectedYield: string;
  }): { subject: string; html: string } {
    const subject = `Commitment confirmed: ${data.commitmentAmount} in ${data.dealName}`;
    const html = emailLayout(`
      <h1>Commitment confirmed</h1>
      <p>Hi ${data.name},</p>
      <p>
        Your soft commitment has been recorded. You'll receive updates as the pool progresses
        toward closing.
      </p>

      <div class="card" style="background-color: #d4edda; border-left: 4px solid #28a745;">
        <h3 class="mb-16">${data.dealName}</h3>
        <div class="stat-grid">
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.commitmentAmount}</div>
            <div class="stat-label">Your Commitment</div>
          </div>
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.expectedYield}</div>
            <div class="stat-label">Expected Yield</div>
          </div>
        </div>
      </div>

      <p><strong>Next steps:</strong></p>
      <ul>
        <li>We'll notify you when the pool reaches its funding target</li>
        <li>You'll receive wire instructions and closing documents</li>
        <li>Funds are due within 3 business days of closing</li>
      </ul>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/portfolio" class="button">View your portfolio</a>
      </p>
    `, { preheader: `Your ${data.commitmentAmount} commitment to ${data.dealName} is confirmed` });

    return { subject, html };
  },

  /**
   * Deal closing soon
   */
  dealClosingSoon(data: {
    name: string;
    dealName: string;
    dealId: string;
    closingDate: string;
    commitmentAmount: string;
  }): { subject: string; html: string } {
    const subject = `Closing soon: ${data.dealName}`;
    const html = emailLayout(`
      <h1>Deal closing soon</h1>
      <p>Hi ${data.name},</p>
      <p>
        The loan pool you've committed to is approaching its closing date. Please review the
        details and prepare for funding.
      </p>

      <div class="card card-highlight">
        <h3 class="mb-8">${data.dealName}</h3>
        <p class="mb-8"><strong>Closing date:</strong> ${data.closingDate}</p>
        <p class="mb-0"><strong>Your commitment:</strong> ${data.commitmentAmount}</p>
      </div>

      <p><strong>Before closing:</strong></p>
      <ul>
        <li>Review final documentation in the deal room</li>
        <li>Ensure funds are ready for wire transfer</li>
        <li>Wire instructions will be sent 24 hours before closing</li>
      </ul>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/deals/${data.dealId}" class="button">View deal</a>
      </p>
    `, { preheader: `${data.dealName} closes on ${data.closingDate} - prepare for funding` });

    return { subject, html };
  },

  /**
   * Deal funded - investment complete
   */
  dealFunded(data: {
    name: string;
    dealName: string;
    dealId: string;
    investmentAmount: string;
    expectedYield: string;
    maturityDate: string;
  }): { subject: string; html: string } {
    const subject = `Investment complete: ${data.dealName}`;
    const html = emailLayout(`
      <h1>Investment complete</h1>
      <p>Hi ${data.name},</p>
      <p>
        Congratulations! The loan pool has closed and your investment is now active. You can
        track performance in your portfolio dashboard.
      </p>

      <div class="card" style="background-color: #d4edda; border-left: 4px solid #28a745;">
        <h3 class="mb-16">${data.dealName}</h3>
        <div class="stat-grid">
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.investmentAmount}</div>
            <div class="stat-label">Investment</div>
          </div>
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.expectedYield}</div>
            <div class="stat-label">Expected Yield</div>
          </div>
          <div class="stat-item" style="border-color: #c3e6cb;">
            <div class="stat-value">${data.maturityDate}</div>
            <div class="stat-label">Maturity</div>
          </div>
        </div>
        <p class="mb-0">
          <span class="badge badge-success">Active Investment</span>
        </p>
      </div>

      <p><strong>What happens now:</strong></p>
      <ul>
        <li>Monthly performance reports will be sent to your email</li>
        <li>Track real-time metrics in your portfolio dashboard</li>
        <li>Distributions will be made according to the deal terms</li>
      </ul>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/investor/portfolio" class="button">View portfolio</a>
      </p>
    `, { preheader: `Your ${data.investmentAmount} investment in ${data.dealName} is now active` });

    return { subject, html };
  },
};

// ============================================================
// ADMIN EMAIL TEMPLATES
// ============================================================

export const adminEmails = {
  /**
   * New lender registration alert
   */
  newLenderAlert(data: {
    lenderName: string;
    companyName: string;
    email: string;
    lenderId: string;
  }): { subject: string; html: string } {
    const subject = `[Admin] New lender: ${data.companyName}`;
    const html = emailLayout(`
      <h1>New lender registration</h1>
      <p>A new lender has registered on PrimeBridge.</p>

      <div class="card">
        <p class="mb-8"><strong>Name:</strong> ${data.lenderName}</p>
        <p class="mb-8"><strong>Company:</strong> ${data.companyName}</p>
        <p class="mb-0"><strong>Email:</strong> ${data.email}</p>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/admin/lenders/${data.lenderId}" class="button">Review lender</a>
      </p>
    `, { preheader: `New lender: ${data.companyName} (${data.lenderName})` });

    return { subject, html };
  },

  /**
   * New investor registration alert
   */
  newInvestorAlert(data: {
    investorName: string;
    email: string;
    investorType: string;
    investorId: string;
  }): { subject: string; html: string } {
    const subject = `[Admin] New investor: ${data.investorName}`;
    const html = emailLayout(`
      <h1>New investor registration</h1>
      <p>A new investor has registered on PrimeBridge.</p>

      <div class="card">
        <p class="mb-8"><strong>Name:</strong> ${data.investorName}</p>
        <p class="mb-8"><strong>Email:</strong> ${data.email}</p>
        <p class="mb-0"><strong>Type:</strong> ${data.investorType}</p>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/admin/investors/${data.investorId}" class="button">Review investor</a>
      </p>
    `, { preheader: `New investor: ${data.investorName} (${data.investorType})` });

    return { subject, html };
  },

  /**
   * New pool submission alert
   */
  newPoolSubmission(data: {
    lenderName: string;
    poolName: string;
    poolId: string;
    poolSize: string;
    assetClass: string;
  }): { subject: string; html: string } {
    const subject = `[Admin] New pool: ${data.poolName}`;
    const html = emailLayout(`
      <h1>New pool submission</h1>
      <p>A lender has submitted a new loan pool for review.</p>

      <div class="card card-highlight">
        <h3 class="mb-8">${data.poolName}</h3>
        <p class="mb-8"><strong>Lender:</strong> ${data.lenderName}</p>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${data.poolSize}</div>
            <div class="stat-label">Pool Size</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.assetClass}</div>
            <div class="stat-label">Asset Class</div>
          </div>
        </div>
      </div>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/admin/pools/${data.poolId}" class="button">Review pool</a>
      </p>
    `, { preheader: `New pool submission: ${data.poolName} (${data.poolSize})` });

    return { subject, html };
  },

  /**
   * Daily summary
   */
  dailySummary(data: {
    date: string;
    newLenders: number;
    newInvestors: number;
    poolsSubmitted: number;
    poolsApproved: number;
    totalCommitments: string;
    pendingReviews: number;
  }): { subject: string; html: string } {
    const subject = `[Admin] Daily summary - ${data.date}`;
    const html = emailLayout(`
      <h1>Daily Summary</h1>
      <p class="text-muted">${data.date}</p>

      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${data.newLenders}</div>
          <div class="stat-label">New Lenders</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.newInvestors}</div>
          <div class="stat-label">New Investors</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.poolsSubmitted}</div>
          <div class="stat-label">Pools Submitted</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${data.poolsApproved}</div>
          <div class="stat-label">Pools Approved</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.totalCommitments}</div>
          <div class="stat-label">Total Commitments</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.pendingReviews}</div>
          <div class="stat-label">Pending Reviews</div>
        </div>
      </div>

      ${data.pendingReviews > 0 ? `
      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/admin" class="button">${data.pendingReviews} items need review</a>
      </p>
      ` : ''}
    `, { preheader: `${data.newLenders} lenders, ${data.newInvestors} investors, ${data.poolsSubmitted} pools today` });

    return { subject, html };
  },
};

// ============================================================
// SHARED/TRANSACTIONAL EMAIL TEMPLATES
// ============================================================

export const sharedEmails = {
  /**
   * Email verification
   */
  emailVerification(data: {
    name: string;
    verificationUrl: string;
    expiresIn: string;
  }): { subject: string; html: string } {
    const subject = 'Verify your email address';
    const html = emailLayout(`
      <h1>Verify your email</h1>
      <p>Hi ${data.name},</p>
      <p>
        Please verify your email address to complete your PrimeBridge registration.
      </p>

      <p class="text-center mb-32">
        <a href="${data.verificationUrl}" class="button">Verify email address</a>
      </p>

      <p class="text-muted text-small">
        This link expires in ${data.expiresIn}. If you didn't create a PrimeBridge account,
        you can safely ignore this email.
      </p>

      <div class="divider"></div>

      <p class="text-muted text-small">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.verificationUrl}">${data.verificationUrl}</a>
      </p>
    `, { preheader: 'Verify your email to complete your PrimeBridge registration' });

    return { subject, html };
  },

  /**
   * Password reset
   */
  passwordReset(data: {
    name: string;
    resetUrl: string;
    expiresIn: string;
  }): { subject: string; html: string } {
    const subject = 'Reset your password';
    const html = emailLayout(`
      <h1>Reset your password</h1>
      <p>Hi ${data.name},</p>
      <p>
        We received a request to reset your PrimeBridge password. Click the button below to
        create a new password.
      </p>

      <p class="text-center mb-32">
        <a href="${data.resetUrl}" class="button">Reset password</a>
      </p>

      <p class="text-muted text-small">
        This link expires in ${data.expiresIn}. If you didn't request a password reset,
        you can safely ignore this email — your password will remain unchanged.
      </p>

      <div class="divider"></div>

      <p class="text-muted text-small">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.resetUrl}">${data.resetUrl}</a>
      </p>
    `, { preheader: 'Reset your PrimeBridge password' });

    return { subject, html };
  },

  /**
   * Password changed confirmation
   */
  passwordChanged(data: {
    name: string;
    changedAt: string;
    ipAddress?: string;
  }): { subject: string; html: string } {
    const subject = 'Your password has been changed';
    const html = emailLayout(`
      <h1>Password changed</h1>
      <p>Hi ${data.name},</p>
      <p>
        Your PrimeBridge password was successfully changed on ${data.changedAt}.
      </p>

      ${data.ipAddress ? `
      <div class="card">
        <p class="mb-0 text-muted text-small">
          <strong>IP Address:</strong> ${data.ipAddress}
        </p>
      </div>
      ` : ''}

      <p>
        If you didn't make this change, please reset your password immediately and contact
        our support team.
      </p>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/login" class="button-secondary button">Log in to your account</a>
      </p>

      <p class="text-muted text-center text-small">
        <a href="mailto:${EMAIL_CONFIG.replyTo}">Contact support</a> if you need help
      </p>
    `, { preheader: 'Your PrimeBridge password has been changed' });

    return { subject, html };
  },

  /**
   * Security alert (new login, suspicious activity)
   */
  securityAlert(data: {
    name: string;
    alertType: 'new_login' | 'suspicious_activity' | 'account_locked';
    details: string;
    timestamp: string;
    ipAddress?: string;
    location?: string;
  }): { subject: string; html: string } {
    const alertTitles = {
      new_login: 'New login to your account',
      suspicious_activity: 'Suspicious activity detected',
      account_locked: 'Your account has been locked',
    };

    const subject = `Security alert: ${alertTitles[data.alertType]}`;
    const html = emailLayout(`
      <h1>${alertTitles[data.alertType]}</h1>
      <p>Hi ${data.name},</p>
      <p>${data.details}</p>

      <div class="card" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
        <p class="mb-8"><strong>Time:</strong> ${data.timestamp}</p>
        ${data.ipAddress ? `<p class="mb-8"><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
        ${data.location ? `<p class="mb-0"><strong>Location:</strong> ${data.location}</p>` : ''}
      </div>

      <p>
        If this was you, no action is needed. If you don't recognize this activity, please
        secure your account immediately.
      </p>

      <p class="text-center mb-24">
        <a href="${EMAIL_CONFIG.baseUrl}/login" class="button">Review account activity</a>
      </p>

      <p class="text-muted text-center text-small">
        Need help? <a href="mailto:${EMAIL_CONFIG.replyTo}">Contact support</a>
      </p>
    `, { preheader: `Security alert: ${alertTitles[data.alertType]}` });

    return { subject, html };
  },
};

// ============================================================
// CONVENIENCE SEND FUNCTIONS
// ============================================================

/**
 * Send a lender email
 */
export async function sendLenderEmail<K extends keyof typeof lenderEmails>(
  template: K,
  to: string,
  data: Parameters<typeof lenderEmails[K]>[0]
): Promise<EmailResult> {
  const { subject, html } = (lenderEmails[template] as any)(data);
  return sendEmail({
    to,
    subject,
    html,
    from: EMAIL_CONFIG.from.default,
    tags: [{ name: 'category', value: 'lender' }, { name: 'template', value: template }],
  });
}

/**
 * Send an investor email
 */
export async function sendInvestorEmail<K extends keyof typeof investorEmails>(
  template: K,
  to: string,
  data: Parameters<typeof investorEmails[K]>[0]
): Promise<EmailResult> {
  const { subject, html } = (investorEmails[template] as any)(data);
  return sendEmail({
    to,
    subject,
    html,
    from: template === 'newDealAvailable' ? EMAIL_CONFIG.from.deals : EMAIL_CONFIG.from.default,
    tags: [{ name: 'category', value: 'investor' }, { name: 'template', value: template }],
  });
}

/**
 * Send an admin email
 */
export async function sendAdminEmail<K extends keyof typeof adminEmails>(
  template: K,
  to: string | string[],
  data: Parameters<typeof adminEmails[K]>[0]
): Promise<EmailResult> {
  const { subject, html } = (adminEmails[template] as any)(data);
  return sendEmail({
    to,
    subject,
    html,
    from: EMAIL_CONFIG.from.noreply,
    tags: [{ name: 'category', value: 'admin' }, { name: 'template', value: template }],
  });
}

/**
 * Send a transactional/shared email
 */
export async function sendTransactionalEmail<K extends keyof typeof sharedEmails>(
  template: K,
  to: string,
  data: Parameters<typeof sharedEmails[K]>[0]
): Promise<EmailResult> {
  const { subject, html } = (sharedEmails[template] as any)(data);
  return sendEmail({
    to,
    subject,
    html,
    from: EMAIL_CONFIG.from.noreply,
    tags: [{ name: 'category', value: 'transactional' }, { name: 'template', value: template }],
  });
}
