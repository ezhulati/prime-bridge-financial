import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-lightest text-dark',
        // Application statuses
        draft: 'bg-light text-dark',
        submitted: 'bg-blue-100 text-blue-800',
        under_review: 'bg-amber-100 text-amber-800',
        term_sheet: 'bg-purple-100 text-purple-800',
        in_funding: 'bg-primary/10 text-primary',
        funded: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        // Interest statuses
        interested: 'bg-blue-100 text-blue-800',
        committed: 'bg-green-100 text-green-800',
        withdrawn: 'bg-light text-dark',
        // General
        success: 'bg-green-100 text-green-800',
        warning: 'bg-amber-100 text-amber-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
