import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          // Base styles following design system
          'flex w-full rounded-md border bg-white px-4 py-3 text-base text-darkest',
          'placeholder:text-medium',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-lightest',
          // Minimum touch target height (48px) - per Practical UI
          'min-h-[48px]',
          // Border color: 3:1 contrast minimum - per Practical UI
          error
            ? 'border-error focus:ring-error'
            : 'border-medium hover:border-dark focus:border-primary',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
