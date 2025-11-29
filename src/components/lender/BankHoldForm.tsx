import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import type { BankHoldStatus } from '../../types/database';

interface BankHold {
  id: string;
  bank_name: string;
  bank_state: string | null;
  hold_start_date: string;
  hold_end_date: string;
  hold_days: number;
  status: BankHoldStatus;
  completed_at: string | null;
  purchase_agreement_url: string | null;
  bank_certification_url: string | null;
  hold_confirmation_number: string | null;
}

interface BankHoldFormProps {
  poolId: string;
  defaultBankName?: string;
  defaultBankState?: string;
  onComplete?: () => void;
}

const statusColors: Record<BankHoldStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  waived: 'bg-purple-100 text-purple-700',
};

const statusLabels: Record<BankHoldStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  waived: 'Waived',
};

export function BankHoldForm({ poolId, defaultBankName, defaultBankState, onComplete }: BankHoldFormProps) {
  const [bankHold, setBankHold] = useState<BankHold | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [bankName, setBankName] = useState(defaultBankName || '');
  const [bankState, setBankState] = useState(defaultBankState || '');
  const [holdStartDate, setHoldStartDate] = useState('');
  const [holdDays, setHoldDays] = useState(5);
  const [confirmationNumber, setConfirmationNumber] = useState('');

  // Load existing bank hold
  useEffect(() => {
    async function loadBankHold() {
      try {
        const response = await fetch(`/api/lender/pools/${poolId}/bank-hold`);
        const data = await response.json();

        if (response.ok && data.bank_hold) {
          setBankHold(data.bank_hold);
          setBankName(data.bank_hold.bank_name);
          setBankState(data.bank_hold.bank_state || '');
          setHoldStartDate(data.bank_hold.hold_start_date);
          setHoldDays(data.bank_hold.hold_days);
          setConfirmationNumber(data.bank_hold.hold_confirmation_number || '');
        }
      } catch {
        // No existing hold
      } finally {
        setIsLoading(false);
      }
    }

    loadBankHold();
  }, [poolId]);

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!bankHold) return null;
    const endDate = new Date(bankHold.hold_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Submit bank hold
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/lender/pools/${poolId}/bank-hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name: bankName,
          bank_state: bankState,
          hold_start_date: holdStartDate,
          hold_days: holdDays,
          hold_confirmation_number: confirmationNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBankHold(data.bank_hold);
        setSuccess('Bank hold submitted successfully');
        onComplete?.();
      } else {
        setError(data.message || 'Failed to submit bank hold');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-lightest rounded-lg" />
      </div>
    );
  }

  // Show status if hold exists
  if (bankHold) {
    const daysRemaining = getDaysRemaining();

    return (
      <div className="space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-lg border border-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-darkest">Bank Hold Status</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[bankHold.status]}`}>
              {statusLabels[bankHold.status]}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-medium">Bank Partner</p>
              <p className="font-medium text-darkest">{bankHold.bank_name}</p>
              {bankHold.bank_state && (
                <p className="text-sm text-medium">{bankHold.bank_state}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-medium">Hold Period</p>
              <p className="font-medium text-darkest">
                {new Date(bankHold.hold_start_date).toLocaleDateString()} - {new Date(bankHold.hold_end_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-medium">{bankHold.hold_days} days</p>
            </div>
          </div>

          {/* Progress indicator for in_progress holds */}
          {bankHold.status === 'in_progress' && daysRemaining !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-medium">Progress</span>
                <span className="font-medium text-darkest">{daysRemaining} days remaining</span>
              </div>
              <div className="w-full bg-lightest rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${((bankHold.hold_days - daysRemaining) / bankHold.hold_days) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Completed indicator */}
          {bankHold.status === 'completed' && (
            <div className="mt-4 flex items-center gap-2 text-success">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Bank hold completed - ready for sale</span>
            </div>
          )}

          {/* Confirmation number */}
          {bankHold.hold_confirmation_number && (
            <div className="mt-4 pt-4 border-t border-light">
              <p className="text-sm text-medium">Confirmation Number</p>
              <p className="font-mono text-darkest">{bankHold.hold_confirmation_number}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show form if no hold exists
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="bg-lightest rounded-lg p-4">
        <p className="text-sm text-dark">
          Submit bank hold certification to confirm that the originating bank has held the loans
          for the required regulatory period (typically 5 days).
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank_name" required>Originating Bank</Label>
          <Input
            id="bank_name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., Cross River Bank"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank_state">Bank State</Label>
          <Input
            id="bank_state"
            value={bankState}
            onChange={(e) => setBankState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="e.g., NJ"
            maxLength={2}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hold_start_date" required>Hold Start Date</Label>
          <Input
            id="hold_start_date"
            type="date"
            value={holdStartDate}
            onChange={(e) => setHoldStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hold_days">Hold Period (days)</Label>
          <Input
            id="hold_days"
            type="number"
            min={1}
            max={30}
            value={holdDays}
            onChange={(e) => setHoldDays(parseInt(e.target.value) || 5)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmation_number">Bank Confirmation Number</Label>
        <Input
          id="confirmation_number"
          value={confirmationNumber}
          onChange={(e) => setConfirmationNumber(e.target.value)}
          placeholder="Optional - bank reference number"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Bank Hold'}
      </Button>
    </form>
  );
}
