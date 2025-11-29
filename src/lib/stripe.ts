import Stripe from 'stripe';

// Server-side Stripe client
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// Platform fee percentage (2.5%)
export const PLATFORM_FEE_PERCENT = 0.025;

// Minimum investment amount
export const MIN_INVESTMENT = 1000;

// Calculate platform fee
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_PERCENT * 100) / 100;
}

// Create or get Stripe customer
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: userId,
      platform: 'primebridge',
    },
  });

  return customer.id;
}

// Create Financial Connections session for bank account linking
export async function createFinancialConnectionsSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.FinancialConnections.Session> {
  const session = await stripe.financialConnections.sessions.create({
    account_holder: {
      type: 'customer',
      customer: customerId,
    },
    permissions: ['payment_method', 'balances'],
    filters: {
      countries: ['US'],
    },
    return_url: returnUrl,
  });

  return session;
}

// Create bank account payment method from Financial Connections
export async function createBankAccountFromFinancialConnections(
  customerId: string,
  financialConnectionsAccountId: string
): Promise<Stripe.PaymentMethod> {
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'us_bank_account',
    us_bank_account: {
      financial_connections_account: financialConnectionsAccountId,
    },
  });

  // Attach to customer
  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  return paymentMethod;
}

// Create ACH payment intent for investment
export async function createInvestmentPaymentIntent(
  customerId: string,
  paymentMethodId: string,
  amount: number,
  dealId: string,
  commitmentId: string
): Promise<Stripe.PaymentIntent> {
  const platformFee = calculatePlatformFee(amount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    payment_method_types: ['us_bank_account'],
    confirm: true,
    mandate_data: {
      customer_acceptance: {
        type: 'online',
        online: {
          ip_address: '0.0.0.0', // Will be replaced with actual IP
          user_agent: 'PrimeBridge Platform',
        },
      },
    },
    metadata: {
      deal_id: dealId,
      commitment_id: commitmentId,
      platform_fee: platformFee.toString(),
      type: 'investment',
    },
  });

  return paymentIntent;
}

// Create payout to lender
export async function createLenderPayout(
  connectAccountId: string,
  amount: number,
  dealId: string
): Promise<Stripe.Transfer> {
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination: connectAccountId,
    metadata: {
      deal_id: dealId,
      type: 'lender_payout',
    },
  });

  return transfer;
}

// Verify micro-deposits
export async function verifyMicroDeposits(
  paymentMethodId: string,
  amounts: [number, number]
): Promise<Stripe.PaymentMethod> {
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  if (paymentMethod.us_bank_account?.verification_method === 'microdeposits') {
    await stripe.paymentMethods.verifyMicrodeposits(paymentMethodId, {
      amounts,
    });
  }

  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

// Get payment method details
export async function getPaymentMethodDetails(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

// List customer payment methods
export async function listCustomerPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'us_bank_account',
  });

  return paymentMethods.data;
}

// Detach payment method
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<void> {
  await stripe.paymentMethods.detach(paymentMethodId);
}

// Create Stripe Connect account for lender
export async function createConnectAccount(
  email: string,
  lenderName: string,
  userId: string
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'company',
    company: {
      name: lenderName,
    },
    metadata: {
      user_id: userId,
      platform: 'primebridge',
    },
  });

  return account;
}

// Create Connect account link for onboarding
export async function createConnectAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

// Check Connect account status
export async function getConnectAccountStatus(
  accountId: string
): Promise<{ isActive: boolean; status: string }> {
  const account = await stripe.accounts.retrieve(accountId);

  const isActive = account.charges_enabled && account.payouts_enabled;
  let status = 'pending';

  if (isActive) {
    status = 'active';
  } else if (account.requirements?.disabled_reason) {
    status = 'restricted';
  }

  return { isActive, status };
}
