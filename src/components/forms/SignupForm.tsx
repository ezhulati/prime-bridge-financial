import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '../../types/forms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';

interface SignupFormProps {
  defaultRole?: 'borrower' | 'investor';
}

export function SignupForm({ defaultRole }: SignupFormProps) {
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

      // Redirect based on role
      window.location.href = result.redirectUrl || '/dashboard';
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!defaultRole && (
        <div className="space-y-2">
          <Label required>I want to</Label>
          {errors.role && (
            <p className="text-sm text-error flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.role.message}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedRole === 'borrower'
                  ? 'border-primary bg-primary/5'
                  : 'border-light hover:border-medium'
              }`}
            >
              <input
                type="radio"
                value="borrower"
                {...register('role')}
                className="sr-only"
              />
              <svg className="h-8 w-8 mb-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-semibold text-darkest">Apply for credit</span>
              <span className="text-sm text-dark mt-1">For businesses</span>
            </label>
            <label
              className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
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
              <svg className="h-8 w-8 mb-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-darkest">Invest in deals</span>
              <span className="text-sm text-dark mt-1">For investors</span>
            </label>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" required>
          Full name
        </Label>
        {errors.name && (
          <p className="text-sm text-error flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.name.message}
          </p>
        )}
        <Input
          id="name"
          type="text"
          autoComplete="name"
          error={!!errors.name}
          {...register('name')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" required>
          Email address
        </Label>
        {errors.email && (
          <p className="text-sm text-error flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.email.message}
          </p>
        )}
        <Input
          id="email"
          type="email"
          autoComplete="email"
          error={!!errors.email}
          {...register('email')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" required>
          Password
        </Label>
        <p className="text-sm text-dark">Must be at least 8 characters</p>
        {errors.password && (
          <p className="text-sm text-error flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.password.message}
          </p>
        )}
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          error={!!errors.password}
          {...register('password')}
        />
      </div>

      <Button type="submit" fullWidth disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-center text-dark">
        Already have an account?{' '}
        <a href="/login" className="text-primary font-semibold">
          Log in
        </a>
      </p>
    </form>
  );
}
