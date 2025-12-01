import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

interface PaymentMethod {
  id: string;
  bank_name: string;
  account_type: string;
  last_four: string;
  is_default: boolean;
}

interface Deal {
  id: string;
  title: string;
  total_amount: number;
  amount_committed: number;
  minimum_investment: number;
  target_yield: number;
  term_months: number;
}

interface InvestmentFormProps {
  deal: Deal;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PLATFORM_FEE_PERCENT = 0.025;

export function InvestmentForm({ deal, onSuccess, onCancel }: InvestmentFormProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [amount, setAmount] = useState<string>(deal.minimum_investment.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'amount' | 'confirm' | 'processing' | 'success'>('amount');

  const available = deal.total_amount - deal.amount_committed;
  const investmentAmount = parseFloat(amount) || 0;
  const platformFee = Math.round(investmentAmount * PLATFORM_FEE_PERCENT * 100) / 100;
  const totalCharge = investmentAmount + platformFee;

  // Load payment methods
  useEffect(() => {
    async function loadMethods() {
      try {
        const response = await fetch('/api/payments/methods');
        const data = await response.json();

        if (response.ok) {
          setPaymentMethods(data.payment_methods || []);
          // Select default method
          const defaultMethod = data.payment_methods?.find((m: PaymentMethod) => m.is_default);
          if (defaultMethod) {
            setSelectedMethod(defaultMethod.id);
          }
        }
      } catch {
        setError('Failed to load payment methods');
      } finally {
        setIsLoadingMethods(false);
      }
    }

    loadMethods();
  }, []);

  // Validate amount
  const validateAmount = () => {
    if (investmentAmount < deal.minimum_investment) {
      setError(`Minimum investment is $${deal.minimum_investment.toLocaleString()}`);
      return false;
    }
    if (investmentAmount > available) {
      setError(`Only $${available.toLocaleString()} available for investment`);
      return false;
    }
    if (!selectedMethod) {
      setError('Please select a payment method');
      return false;
    }
    setError(null);
    return true;
  };

  // Handle continue to confirmation
  const handleContinue = () => {
    if (validateAmount()) {
      setStep('confirm');
    }
  };

  // Handle investment submission
  const handleInvest = async () => {
    if (!validateAmount()) return;

    setIsLoading(true);
    setStep('processing');
    setError(null);

    try {
      const response = await fetch('/api/payments/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          amount: investmentAmount,
          payment_method_id: selectedMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(data.message || 'Investment failed');
        setStep('confirm');
      }
    } catch {
      setError('An error occurred processing your investment');
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingMethods) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-medium mt-4">Loading payment methods...</p>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="p-6 text-center">
        <svg className="w-12 h-12 text-medium mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <h3 className="text-lg font-bold text-darkest mb-2">No Payment Method</h3>
        <p className="text-dark mb-4">
          You need to link a bank account before making investments.
        </p>
        <a
          href="/investor/settings#payment-methods"
          className="inline-flex items-center justify-center bg-primary text-white hover:bg-primary-hover min-h-[48px] px-6 rounded-md font-semibold no-underline"
        >
          Link Bank Account
        </a>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-12 h-12 border-3 border-primary border-t-transparent rounded-full mx-auto" />
        <h3 className="text-lg font-bold text-darkest mt-6">Processing Investment</h3>
        <p className="text-dark mt-2">Please wait while we process your ACH payment...</p>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-darkest mt-6">Investment Submitted!</h3>
        <p className="text-dark mt-2">
          Your investment of ${investmentAmount.toLocaleString()} has been initiated.
          ACH transfers typically take 3-5 business days to process.
        </p>
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

      {step === 'amount' && (
        <>
          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Investment Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark">$</span>
              <Input
                id="amount"
                type="number"
                min={deal.minimum_investment}
                max={available}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-sm text-medium">
              Min: ${deal.minimum_investment.toLocaleString()} • Available: ${available.toLocaleString()}
            </p>
          </div>

          {/* Payment method selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank account..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.bank_name} •••• {method.last_four}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {investmentAmount > 0 && (
            <div className="bg-lightest rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark">Investment amount</span>
                <span className="text-darkest">${investmentAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark">Platform fee (2.5%)</span>
                <span className="text-darkest">${platformFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-light pt-2 flex justify-between font-semibold">
                <span className="text-darkest">Total</span>
                <span className="text-darkest">${totalCharge.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button onClick={handleContinue} className="flex-1">
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className="text-center pb-4 border-b border-light">
            <h3 className="text-lg font-bold text-darkest">Confirm Investment</h3>
            <p className="text-dark mt-1">{deal.title}</p>
          </div>

          {/* Investment details */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-dark">Investment Amount</span>
              <span className="font-semibold text-darkest">${investmentAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark">Target Yield</span>
              <span className="font-semibold text-success">{deal.target_yield}% APY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark">Term</span>
              <span className="font-semibold text-darkest">{deal.term_months} months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark">Platform Fee</span>
              <span className="font-semibold text-darkest">${platformFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-light pt-4 flex justify-between">
              <span className="font-semibold text-darkest">Total Charge</span>
              <span className="font-bold text-xl text-darkest">${totalCharge.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-lightest rounded-lg p-4">
            <p className="text-sm text-medium mb-1">Payment Method</p>
            <p className="font-medium text-darkest">
              {paymentMethods.find(m => m.id === selectedMethod)?.bank_name} ••••
              {paymentMethods.find(m => m.id === selectedMethod)?.last_four}
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-medium">
            By clicking "Confirm Investment", you authorize PrimeBridge Finance to debit ${totalCharge.toLocaleString()} from your bank account via ACH.
            ACH transfers typically take 3-5 business days to process.
            Investments in private credit involve risk, including possible loss of principal.
          </p>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep('amount')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleInvest} disabled={isLoading} className="flex-1">
              {isLoading ? 'Processing...' : 'Confirm Investment'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
