import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles following design system
          'flex w-full rounded-md border bg-white px-4 py-3 text-base text-darkest',
          'placeholder:text-medium',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-lightest',
          'min-h-[120px] resize-y',
          // Border color: 3:1 contrast minimum
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
Textarea.displayName = 'Textarea';

export { Textarea };
