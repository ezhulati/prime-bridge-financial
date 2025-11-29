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
import type { LoanPool, RiskTier } from '../../types/database';

const dealSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  total_amount: z.number().min(10000, 'Minimum deal size is $10,000'),
  minimum_investment: z.number().min(1000, 'Minimum investment must be at least $1,000'),
  target_yield: z.number().min(0).max(100, 'Yield must be between 0-100%'),
  term_months: z.number().min(1, 'Term must be at least 1 month'),
  payment_frequency: z.enum(['monthly', 'quarterly']),
  risk_tier: z.enum(['A', 'B', 'C', 'D', 'unrated'] as const),
  platform_fee_percent: z.number().min(0).max(10, 'Platform fee must be between 0-10%'),
  servicing_fee_percent: z.number().min(0).max(10, 'Servicing fee must be between 0-10%'),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  pool: LoanPool & { lenders?: { company_name: string; risk_tier: RiskTier } };
  adminId: string;
}

export function DealForm({ pool, adminId }: DealFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentFreq, setSelectedPaymentFreq] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedRiskTier, setSelectedRiskTier] = useState<RiskTier>(pool.platform_risk_tier || pool.lenders?.risk_tier || 'unrated');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: `${pool.pool_name} Investment`,
      total_amount: pool.total_outstanding_balance,
      minimum_investment: 25000,
      target_yield: pool.suggested_yield || pool.weighted_avg_apr * 0.7,
      term_months: pool.weighted_avg_term_months,
      payment_frequency: 'monthly',
      risk_tier: pool.platform_risk_tier || pool.lenders?.risk_tier || 'unrated',
      platform_fee_percent: 1.0,
      servicing_fee_percent: 0.5,
    },
  });

  const watchTargetYield = watch('target_yield');
  const watchPlatformFee = watch('platform_fee_percent');
  const watchServicingFee = watch('servicing_fee_percent');
  const netYield = (watchTargetYield || 0) - (watchPlatformFee || 0) - (watchServicingFee || 0);

  const onSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          loan_pool_id: pool.id,
          lender_id: pool.lender_id,
          loan_type: pool.loan_type,
          total_loans: pool.total_loans,
          weighted_avg_fico: pool.weighted_avg_fico,
          expected_loss: pool.expected_loss,
          created_by: adminId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create deal');
      }

      // Redirect to the deal detail page
      window.location.href = `/admin/deals/${result.id}`;
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deal Information */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Deal Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="title" required>Deal Title</Label>
            <Input
              id="title"
              placeholder="e.g., Q1 2025 Consumer Loan Pool"
              error={!!errors.title}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-error">{errors.title.message}</p>
            )}
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description" optional>Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the investment opportunity..."
              rows={4}
              {...register('description')}
            />
          </div>
        </div>
      </div>

      {/* Deal Terms */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Deal Terms</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="total_amount" required>Deal Size ($)</Label>
            <Input
              id="total_amount"
              type="number"
              step="1000"
              error={!!errors.total_amount}
              {...register('total_amount', { valueAsNumber: true })}
            />
            {errors.total_amount && (
              <p className="text-sm text-error">{errors.total_amount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimum_investment" required>Minimum Investment ($)</Label>
            <Input
              id="minimum_investment"
              type="number"
              step="1000"
              error={!!errors.minimum_investment}
              {...register('minimum_investment', { valueAsNumber: true })}
            />
            {errors.minimum_investment && (
              <p className="text-sm text-error">{errors.minimum_investment.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="term_months" required>Term (months)</Label>
            <Input
              id="term_months"
              type="number"
              error={!!errors.term_months}
              {...register('term_months', { valueAsNumber: true })}
            />
            {errors.term_months && (
              <p className="text-sm text-error">{errors.term_months.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label required>Payment Frequency</Label>
            <Select
              value={selectedPaymentFreq}
              onValueChange={(value: 'monthly' | 'quarterly') => {
                setSelectedPaymentFreq(value);
                setValue('payment_frequency', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label required>Risk Tier</Label>
            <Select
              value={selectedRiskTier}
              onValueChange={(value: RiskTier) => {
                setSelectedRiskTier(value);
                setValue('risk_tier', value);
              }}
            >
              <SelectTrigger error={!!errors.risk_tier}>
                <SelectValue placeholder="Select risk tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A - Prime</SelectItem>
                <SelectItem value="B">B - Near Prime</SelectItem>
                <SelectItem value="C">C - Subprime</SelectItem>
                <SelectItem value="D">D - Deep Subprime</SelectItem>
                <SelectItem value="unrated">Unrated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Yield & Fees */}
      <div className="bg-white rounded-xl border border-light p-6">
        <h3 className="text-lg font-bold text-darkest mb-6">Yield & Fees</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="target_yield" required>Target Yield (%)</Label>
            <Input
              id="target_yield"
              type="number"
              step="0.01"
              error={!!errors.target_yield}
              {...register('target_yield', { valueAsNumber: true })}
            />
            {errors.target_yield && (
              <p className="text-sm text-error">{errors.target_yield.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform_fee_percent" required>Platform Fee (%)</Label>
            <Input
              id="platform_fee_percent"
              type="number"
              step="0.01"
              error={!!errors.platform_fee_percent}
              {...register('platform_fee_percent', { valueAsNumber: true })}
            />
            {errors.platform_fee_percent && (
              <p className="text-sm text-error">{errors.platform_fee_percent.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="servicing_fee_percent" required>Servicing Fee (%)</Label>
            <Input
              id="servicing_fee_percent"
              type="number"
              step="0.01"
              error={!!errors.servicing_fee_percent}
              {...register('servicing_fee_percent', { valueAsNumber: true })}
            />
            {errors.servicing_fee_percent && (
              <p className="text-sm text-error">{errors.servicing_fee_percent.message}</p>
            )}
          </div>
        </div>

        {/* Net Yield Preview */}
        <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center justify-between">
            <span className="font-medium text-darkest">Net Yield to Investor</span>
            <span className="text-2xl font-bold text-success">{netYield.toFixed(2)}%</span>
          </div>
          <p className="text-sm text-dark mt-1">
            Target Yield ({watchTargetYield?.toFixed(2)}%) - Platform Fee ({watchPlatformFee?.toFixed(2)}%) - Servicing Fee ({watchServicingFee?.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <a
          href="/admin/deals"
          className="inline-flex items-center justify-center border border-light text-dark hover:bg-lightest min-h-[48px] px-6 rounded-md font-medium no-underline"
        >
          Cancel
        </a>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Deal'}
        </Button>
      </div>
    </form>
  );
}
