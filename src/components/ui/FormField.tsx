import * as React from 'react';
import { Label } from './Label';
import { cn } from '../../lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField component following Practical UI patterns:
 * - Labels on TOP of fields
 * - Hints ABOVE the input (after label)
 * - Errors ABOVE the input (after hint)
 * - Required/optional marking with asterisk or (optional)
 */
export function FormField({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} required={required} optional={optional}>
        {label}
      </Label>
      {hint && (
        <p className="text-sm text-dark">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-error flex items-center gap-1.5" role="alert">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
