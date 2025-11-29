import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../types/forms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to log in');
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
          autoComplete="current-password"
          error={!!errors.password}
          {...register('password')}
        />
      </div>

      <Button type="submit" fullWidth disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Log in'}
      </Button>

      <p className="text-center text-dark">
        Don't have an account?{' '}
        <a href="/signup" className="text-primary font-semibold">
          Sign up
        </a>
      </p>
    </form>
  );
}
