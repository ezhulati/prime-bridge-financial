import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';

interface PaymentMethod {
  id: string;
  bank_name: string;
  account_type: string;
  last_four: string;
  status: string;
  is_default: boolean;
  created_at: string;
}

interface PaymentMethodsManagerProps {
  stripePublicKey: string;
  onMethodAdded?: () => void;
}

export function PaymentMethodsManager({ stripePublicKey, onMethodAdded }: PaymentMethodsManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load payment methods
  const loadPaymentMethods = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/methods');
      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(data.payment_methods || []);
      } else {
        setError(data.message || 'Failed to load payment methods');
      }
    } catch {
      setError('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentMethods();

    // Check URL for successful linking callback
    const urlParams = new URLSearchParams(window.location.search);
    const fcAccountId = urlParams.get('financial_connections_account');

    if (fcAccountId) {
      handleFinancialConnectionsCallback(fcAccountId);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadPaymentMethods]);

  // Handle Financial Connections callback
  const handleFinancialConnectionsCallback = async (accountId: string) => {
    setIsLinking(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financial_connections_account_id: accountId,
          set_default: paymentMethods.length === 0,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Bank account linked successfully!');
        loadPaymentMethods();
        onMethodAdded?.();
      } else {
        setError(data.message || 'Failed to link bank account');
      }
    } catch {
      setError('Failed to link bank account');
    } finally {
      setIsLinking(false);
    }
  };

  // Start bank account linking flow
  const handleLinkBankAccount = async () => {
    setIsLinking(true);
    setError(null);

    try {
      // Get Financial Connections session
      const response = await fetch('/api/payments/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_url: `${window.location.origin}${window.location.pathname}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start linking process');
      }

      // Load Stripe
      const stripe = await loadStripe(stripePublicKey);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Open Financial Connections modal
      const { financialConnectionsSession, error: fcError } = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: data.client_secret,
      });

      if (fcError) {
        throw new Error(fcError.message);
      }

      if (financialConnectionsSession?.accounts && financialConnectionsSession.accounts.length > 0) {
        // Link the first account
        await handleFinancialConnectionsCallback(financialConnectionsSession.accounts[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link bank account');
    } finally {
      setIsLinking(false);
    }
  };

  // Remove payment method
  const handleRemove = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payments/methods?id=${methodId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Payment method removed');
        loadPaymentMethods();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to remove payment method');
      }
    } catch {
      setError('Failed to remove payment method');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-lightest rounded-lg" />
        <div className="h-16 bg-lightest rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Payment methods list */}
      {paymentMethods.length > 0 ? (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-light"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-darkest">{method.bank_name}</span>
                    {method.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-medium">
                    {method.account_type.charAt(0).toUpperCase() + method.account_type.slice(1)} ••••{method.last_four}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(method.id)}
                className="text-sm text-error hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-lightest rounded-lg">
          <svg className="w-12 h-12 text-medium mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-dark font-medium">No payment methods</p>
          <p className="text-medium text-sm mt-1">Link a bank account to make investments</p>
        </div>
      )}

      {/* Add payment method button */}
      <Button
        onClick={handleLinkBankAccount}
        disabled={isLinking}
        variant="outline"
        className="w-full"
      >
        {isLinking ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Link Bank Account
          </span>
        )}
      </Button>

      <p className="text-xs text-medium text-center">
        Bank account linking is powered by Stripe Financial Connections.
        Your credentials are never shared with PrimeBridge.
      </p>
    </div>
  );
}
