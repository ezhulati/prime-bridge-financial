import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // Base styles following design system
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary: Solid fill, ONE per screen max
        primary:
          'bg-primary text-white hover:bg-primary-hover min-h-[48px] px-6 rounded-md',
        // Secondary: Border only, no fill
        secondary:
          'border-2 border-primary text-primary bg-transparent hover:bg-primary/5 min-h-[48px] px-6 rounded-md',
        // Tertiary: Text only with underline
        tertiary:
          'text-primary underline underline-offset-2 hover:text-primary-hover px-2 min-h-[48px]',
        // Destructive: For dangerous actions
        destructive:
          'bg-error text-white hover:bg-error/90 min-h-[48px] px-6 rounded-md',
        // Ghost: Subtle background on hover
        ghost:
          'hover:bg-lightest text-darkest min-h-[48px] px-4 rounded-md',
      },
      size: {
        default: 'text-base',
        sm: 'text-sm min-h-[48px] px-4',
        lg: 'text-lg min-h-[56px] px-8',
        icon: 'min-h-[48px] min-w-[48px] px-3',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
