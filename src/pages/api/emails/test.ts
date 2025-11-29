import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import {
  lenderEmails,
  investorEmails,
  adminEmails,
  sharedEmails,
  sendEmail,
  EMAIL_CONFIG,
} from '../../../lib/email';

/**
 * Test endpoint to preview and send test emails
 * Only available in development or to admin users
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check if in development or user is admin
    const isDev = import.meta.env.DEV;
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();

    if (!isDev) {
      // In production, require admin role
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
      }
    }

    const body = await request.json();
    const { action, category, template, data, to } = body;

    // Get the template function
    const templates: Record<string, Record<string, Function>> = {
      lender: lenderEmails,
      investor: investorEmails,
      admin: adminEmails,
      shared: sharedEmails,
    };

    const templateCategory = templates[category];
    if (!templateCategory) {
      return new Response(
        JSON.stringify({ error: 'Invalid category', available: Object.keys(templates) }),
        { status: 400 }
      );
    }

    const templateFn = templateCategory[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: 'Invalid template', available: Object.keys(templateCategory) }),
        { status: 400 }
      );
    }

    // Generate the email
    const email = templateFn(data);

    if (action === 'preview') {
      // Return the generated HTML for preview
      return new Response(
        JSON.stringify({
          subject: email.subject,
          html: email.html,
          previewUrl: `data:text/html;base64,${Buffer.from(email.html).toString('base64')}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send') {
      if (!to) {
        return new Response(
          JSON.stringify({ error: 'Missing "to" email address' }),
          { status: 400 }
        );
      }

      const result = await sendEmail({
        to,
        subject: `[TEST] ${email.subject}`,
        html: email.html,
        from: EMAIL_CONFIG.from.default,
      });

      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action', available: ['preview', 'send'] }),
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Email test error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};

/**
 * GET endpoint to list all available templates
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const isDev = import.meta.env.DEV;

    if (!isDev) {
      const supabase = createSupabaseServerClient(cookies);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
      }
    }

    const templates = {
      lender: Object.keys(lenderEmails),
      investor: Object.keys(investorEmails),
      admin: Object.keys(adminEmails),
      shared: Object.keys(sharedEmails),
    };

    // Include sample data for each template
    const sampleData = {
      lender: {
        welcome: { name: 'John Smith', companyName: 'Acme Lending' },
        poolSubmitted: { name: 'John', poolName: 'Consumer Q1 2025', poolId: 'pool_123', totalAmount: '$5,000,000', assetClass: 'Consumer' },
        poolApproved: { name: 'John', poolName: 'Consumer Q1 2025', poolId: 'pool_123', targetYield: '14%', totalAmount: '$5,000,000' },
        poolRejected: { name: 'John', poolName: 'Consumer Q1 2025', poolId: 'pool_123', reason: 'Insufficient historical data', suggestions: ['Provide 12+ months of performance data', 'Include detailed loss analysis'] },
        investorInterest: { name: 'John', poolName: 'Consumer Q1 2025', poolId: 'pool_123', investorCount: 5, totalInterest: '$2,500,000' },
        commitmentReceived: { name: 'John', poolName: 'Consumer Q1 2025', poolId: 'pool_123', investorName: 'Jane Investor', commitmentAmount: '$500,000', totalCommitted: '$2,500,000', targetAmount: '$5,000,000', percentFunded: 50 },
        poolFunded: { name: 'John', poolName: 'Consumer Q1 2025', poolId: 'pool_123', totalFunded: '$5,000,000', investorCount: 8 },
      },
      investor: {
        welcome: { name: 'Jane Investor' },
        accreditationPending: { name: 'Jane' },
        accreditationApproved: { name: 'Jane', availableDeals: 5 },
        accreditationRejected: { name: 'Jane', reason: 'Documentation incomplete - please provide certified financial statements', canReapply: true },
        newDealAvailable: { name: 'Jane', dealName: 'Consumer Q1 2025', dealId: 'deal_123', assetClass: 'Consumer Installment', targetYield: '14%', poolSize: '$5,000,000', duration: '12 months', lenderName: 'Acme Lending' },
        commitmentConfirmed: { name: 'Jane', dealName: 'Consumer Q1 2025', dealId: 'deal_123', commitmentAmount: '$250,000', expectedYield: '14%' },
        dealClosingSoon: { name: 'Jane', dealName: 'Consumer Q1 2025', dealId: 'deal_123', closingDate: 'January 15, 2025', commitmentAmount: '$250,000' },
        dealFunded: { name: 'Jane', dealName: 'Consumer Q1 2025', dealId: 'deal_123', investmentAmount: '$250,000', expectedYield: '14%', maturityDate: 'January 2026' },
      },
      admin: {
        newLenderAlert: { lenderName: 'John Smith', companyName: 'Acme Lending', email: 'john@acmelending.com', lenderId: 'lender_123' },
        newInvestorAlert: { investorName: 'Jane Investor', email: 'jane@investor.com', investorType: 'Accredited Individual', investorId: 'investor_123' },
        newPoolSubmission: { lenderName: 'Acme Lending', poolName: 'Consumer Q1 2025', poolId: 'pool_123', poolSize: '$5,000,000', assetClass: 'Consumer' },
        dailySummary: { date: 'November 29, 2025', newLenders: 3, newInvestors: 7, poolsSubmitted: 2, poolsApproved: 1, totalCommitments: '$1,250,000', pendingReviews: 4 },
      },
      shared: {
        emailVerification: { name: 'User', verificationUrl: 'https://primebridge.finance/verify?token=abc123', expiresIn: '24 hours' },
        passwordReset: { name: 'User', resetUrl: 'https://primebridge.finance/reset?token=abc123', expiresIn: '1 hour' },
        passwordChanged: { name: 'User', changedAt: 'November 29, 2025 at 10:30 AM', ipAddress: '192.168.1.1' },
        securityAlert: { name: 'User', alertType: 'new_login', details: 'A new login was detected from a device we don\'t recognize.', timestamp: 'November 29, 2025 at 10:30 AM', ipAddress: '192.168.1.1', location: 'Austin, TX' },
      },
    };

    return new Response(
      JSON.stringify({ templates, sampleData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Email templates list error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
