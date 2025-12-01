import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '../../types/forms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { FormField } from '../ui/FormField';
import { Alert, AlertDescription } from '../ui/Alert';

interface SignupFormProps {
  defaultRole?: 'lender' | 'investor';
  redirectUrl?: string;
  unlockPending?: boolean;
}

export function SignupForm({ defaultRole, redirectUrl, unlockPending }: SignupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: defaultRole,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create account');
        return;
      }

      // Mark as authenticated for demo
      localStorage.setItem('primebridge_auth', 'true');

      // If unlocking pending validation, go back to upload with unlock flag
      if (unlockPending && redirectUrl) {
        window.location.href = `${redirectUrl}?unlocked=true`;
        return;
      }

      // Use custom redirect or default based on role
      window.location.href = redirectUrl || result.redirectUrl || '/';
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if there are any validation errors
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Required fields instruction */}
      <p className="text-sm text-dark">
        Required fields are marked with an asterisk <span className="text-error">*</span>
      </p>

      {/* Error summary at top */}
      {(error || hasErrors) && (
        <Alert variant="error">
          <AlertDescription>
            {error || 'Please fix the errors below'}
          </AlertDescription>
        </Alert>
      )}

      {!defaultRole && (
        <div className="space-y-2">
          <Label required>I want to</Label>
          {errors.role && (
            <p className="text-sm text-error flex items-center gap-1.5" role="alert">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.role.message}
            </p>
          )}
          {/* Radio button cards - stacked on mobile for 48pt touch targets */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label
              className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-colors min-h-[120px] ${
                selectedRole === 'lender'
                  ? 'border-primary bg-primary/5'
                  : 'border-light hover:border-medium'
              }`}
            >
              <input
                type="radio"
                value="lender"
                {...register('role')}
                className="sr-only"
              />
              <svg className="h-8 w-8 mb-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="font-semibold text-darkest">List loan pools</span>
              <span className="text-sm text-dark mt-1">For fintech lenders</span>
            </label>
            <label
              className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-colors min-h-[120px] ${
                selectedRole === 'investor'
                  ? 'border-primary bg-primary/5'
                  : 'border-light hover:border-medium'
              }`}
            >
              <input
                type="radio"
                value="investor"
                {...register('role')}
                className="sr-only"
              />
              <svg className="h-8 w-8 mb-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-darkest">Invest in deals</span>
              <span className="text-sm text-dark mt-1">For investors</span>
            </label>
          </div>
        </div>
      )}

      <FormField
        label="Full name"
        htmlFor="name"
        required
        error={errors.name?.message}
      >
        <Input
          id="name"
          type="text"
          autoComplete="name"
          error={!!errors.name}
          {...register('name')}
        />
      </FormField>

      <FormField
        label="Email address"
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          error={!!errors.email}
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        required
        hint="Must be at least 8 characters"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          error={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" fullWidth loading={isLoading}>
        Create account
      </Button>
    </form>
  );
}
