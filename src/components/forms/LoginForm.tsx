import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../types/forms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { Alert, AlertDescription } from '../ui/Alert';

interface LoginFormProps {
  redirectUrl?: string;
}

export function LoginForm({ redirectUrl }: LoginFormProps) {
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

      // Mark as authenticated for demo
      localStorage.setItem('primebridge_auth', 'true');

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
      {/* Error summary at top */}
      {(error || hasErrors) && (
        <Alert variant="error">
          <AlertDescription>
            {error || 'Please fix the errors below'}
          </AlertDescription>
        </Alert>
      )}

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
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        required
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          error={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" fullWidth loading={isLoading}>
        Log in
      </Button>
    </form>
  );
}
