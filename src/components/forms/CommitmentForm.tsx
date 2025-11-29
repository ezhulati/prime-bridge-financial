import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';

interface CommitmentFormProps {
  dealId: string;
  investorId: string;
  minInvestment: number;
  maxInvestment: number;
  targetYield: number;
}

export function CommitmentForm({
  dealId,
  investorId,
  minInvestment,
  maxInvestment,
  targetYield,
}: CommitmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitmentSchema = z.object({
    amount: z
      .number()
      .min(minInvestment, `Minimum investment is $${minInvestment.toLocaleString()}`)
      .max(maxInvestment, `Maximum available is $${maxInvestment.toLocaleString()}`),
  });

  type CommitmentFormData = z.infer<typeof commitmentSchema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CommitmentFormData>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: {
      amount: minInvestment,
    },
  });

  const watchAmount = watch('amount');
  const estimatedAnnualReturn = watchAmount ? (watchAmount * targetYield) / 100 : 0;

  const onSubmit = async (data: CommitmentFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/investor/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: dealId,
          investor_id: investorId,
          amount: data.amount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit commitment');
      }

      // Reload to show success state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount" required>
          Investment Amount ($)
        </Label>
        <Input
          id="amount"
          type="number"
          min={minInvestment}
          max={maxInvestment}
          step={1000}
          error={!!errors.amount}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-error">{errors.amount.message}</p>
        )}
      </div>

      {/* Estimated Returns */}
      <div className="p-4 bg-success/10 rounded-lg border border-success/20">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-dark">Target Yield</span>
          <span className="font-semibold text-darkest">{targetYield}% APY</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-dark">Est. Annual Return</span>
          <span className="font-bold text-success">{formatCurrency(estimatedAnnualReturn)}</span>
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[minInvestment, Math.min(minInvestment * 2, maxInvestment), Math.min(minInvestment * 5, maxInvestment)]
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                const input = document.getElementById('amount') as HTMLInputElement;
                if (input) {
                  input.value = String(amount);
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              className="py-2 px-3 text-sm font-medium text-dark border border-light rounded-md hover:bg-lightest transition-colors"
            >
              {formatCurrency(amount)}
            </button>
          ))}
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Submit Commitment
      </Button>

      <p className="text-xs text-medium text-center">
        By submitting, you agree to our terms and acknowledge this is a binding commitment subject to final documentation.
      </p>
    </form>
  );
}
