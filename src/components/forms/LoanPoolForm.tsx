import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Alert, AlertDescription } from '../ui/Alert';
import type { LoanType } from '../../types/database';

const loanPoolSchema = z.object({
  pool_name: z.string().min(3, 'Pool name must be at least 3 characters'),
  loan_type: z.enum(['consumer', 'auto', 'bnpl', 'medical', 'sme'] as const),
  total_loans: z.number().min(1, 'Must have at least 1 loan'),
  total_principal: z.number().min(10000, 'Minimum principal is $10,000'),
  total_outstanding_balance: z.number().min(0, 'Balance cannot be negative'),
  weighted_avg_apr: z.number().min(0).max(100, 'APR must be between 0-100%'),
  weighted_avg_term_months: z.number().min(1, 'Term must be at least 1 month'),
  weighted_avg_fico: z.number().min(300).max(850).optional().nullable(),
  originating_bank: z.string().optional(),
  pool_reference: z.string().optional(),
});

type LoanPoolFormData = z.infer<typeof loanPoolSchema>;

const loanTypeOptions: { value: LoanType; label: string }[] = [
  { value: 'consumer', label: 'Consumer Loans' },
  { value: 'auto', label: 'Auto Loans' },
  { value: 'bnpl', label: 'Buy Now Pay Later' },
  { value: 'medical', label: 'Medical Financing' },
  { value: 'sme', label: 'SME/Business Loans' },
];

interface LoanPoolFormProps {
  lenderId: string;
}

export function LoanPoolForm({ lenderId }: LoanPoolFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType | ''>('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoanPoolFormData>({
    resolver: zodResolver(loanPoolSchema),
  });

  const onSubmit = async (data: LoanPoolFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/lender/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          lender_id: lenderId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create loan pool');
      }

      // Redirect to the pool detail page
      window.location.href = `/lender/pools/${result.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pool Identification */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Pool Identification</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="pool_name" required>Pool Name</Label>
            <Input
              id="pool_name"
              placeholder="e.g., Q1 2025 Consumer Pool"
              error={!!errors.pool_name}
              {...register('pool_name')}
            />
            {errors.pool_name && (
              <p className="text-sm text-error">{errors.pool_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pool_reference" optional>Internal Reference</Label>
            <Input
              id="pool_reference"
              placeholder="Your internal pool ID"
              {...register('pool_reference')}
            />
          </div>
        </div>
      </div>

      {/* Loan Type & Composition */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Pool Composition</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label required>Loan Type</Label>
            <Select
              value={selectedLoanType}
              onValueChange={(value: LoanType) => {
                setSelectedLoanType(value);
                setValue('loan_type', value);
              }}
            >
              <SelectTrigger error={!!errors.loan_type}>
                <SelectValue placeholder="Select loan type" />
              </SelectTrigger>
              <SelectContent>
                {loanTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.loan_type && (
              <p className="text-sm text-error">{errors.loan_type.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_loans" required>Total Number of Loans</Label>
            <Input
              id="total_loans"
              type="number"
              placeholder="e.g., 500"
              error={!!errors.total_loans}
              {...register('total_loans', { valueAsNumber: true })}
            />
            {errors.total_loans && (
              <p className="text-sm text-error">{errors.total_loans.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_principal" required>Total Principal ($)</Label>
            <Input
              id="total_principal"
              type="number"
              placeholder="e.g., 5000000"
              error={!!errors.total_principal}
              {...register('total_principal', { valueAsNumber: true })}
            />
            {errors.total_principal && (
              <p className="text-sm text-error">{errors.total_principal.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_outstanding_balance" required>Outstanding Balance ($)</Label>
            <Input
              id="total_outstanding_balance"
              type="number"
              placeholder="e.g., 4800000"
              error={!!errors.total_outstanding_balance}
              {...register('total_outstanding_balance', { valueAsNumber: true })}
            />
            {errors.total_outstanding_balance && (
              <p className="text-sm text-error">{errors.total_outstanding_balance.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pool Characteristics */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Pool Characteristics</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="weighted_avg_apr" required>Weighted Avg APR (%)</Label>
            <Input
              id="weighted_avg_apr"
              type="number"
              step="0.01"
              placeholder="e.g., 18.5"
              error={!!errors.weighted_avg_apr}
              {...register('weighted_avg_apr', { valueAsNumber: true })}
            />
            {errors.weighted_avg_apr && (
              <p className="text-sm text-error">{errors.weighted_avg_apr.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weighted_avg_term_months" required>Avg Term (months)</Label>
            <Input
              id="weighted_avg_term_months"
              type="number"
              placeholder="e.g., 36"
              error={!!errors.weighted_avg_term_months}
              {...register('weighted_avg_term_months', { valueAsNumber: true })}
            />
            {errors.weighted_avg_term_months && (
              <p className="text-sm text-error">{errors.weighted_avg_term_months.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weighted_avg_fico" optional>Avg FICO Score</Label>
            <Input
              id="weighted_avg_fico"
              type="number"
              placeholder="e.g., 680"
              error={!!errors.weighted_avg_fico}
              {...register('weighted_avg_fico', { valueAsNumber: true })}
            />
            {errors.weighted_avg_fico && (
              <p className="text-sm text-error">{errors.weighted_avg_fico.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bank Partnership */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Origination Details</h3>
        <div className="space-y-2">
          <Label htmlFor="originating_bank" optional>Originating Bank Partner</Label>
          <Input
            id="originating_bank"
            placeholder="e.g., Cross River Bank"
            {...register('originating_bank')}
          />
          <p className="text-sm text-medium mt-1">
            The bank that originated these loans (if using bank partnership model)
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <a
          href="/lender/pools"
          className="inline-flex items-center justify-center border border-light text-dark hover:bg-lightest min-h-[48px] px-6 rounded-md font-medium no-underline"
        >
          Cancel
        </a>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Pool'}
        </Button>
      </div>
    </form>
  );
}
