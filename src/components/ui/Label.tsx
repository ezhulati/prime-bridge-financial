import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/utils';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
    optional?: boolean;
  }
>(({ className, required, optional, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      // Labels above fields, semibold, dark color
      'text-base font-semibold text-darkest block',
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="text-error ml-1">*</span>}
    {optional && <span className="text-dark font-normal ml-1">(optional)</span>}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
