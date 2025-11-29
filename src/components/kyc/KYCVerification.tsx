import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';

interface KYCVerificationProps {
  personaEnvironment?: string; // 'sandbox' or 'production'
  onComplete?: (status: 'passed' | 'failed') => void;
}

type KYCStatus = 'not_started' | 'pending' | 'initiated' | 'processing' | 'passed' | 'failed' | 'expired' | 'requires_review';

declare global {
  interface Window {
    Persona?: {
      Client: new (options: {
        templateId?: string;
        inquiryId?: string;
        sessionToken?: string;
        environment?: string;
        onLoad?: () => void;
        onStart?: (inquiryId: string) => void;
        onComplete?: (inquiryId: string, status: string) => void;
        onCancel?: (inquiryId: string) => void;
        onError?: (error: Error) => void;
      }) => {
        open: () => void;
      };
    };
  }
}

export function KYCVerification({ personaEnvironment = 'sandbox', onComplete }: KYCVerificationProps) {
  const [status, setStatus] = useState<KYCStatus>('not_started');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current KYC status
  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch('/api/kyc/start');
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status as KYCStatus);
        }
      } catch {
        setError('Failed to load KYC status');
      } finally {
        setIsLoading(false);
      }
    }

    loadStatus();

    // Load Persona SDK
    if (!document.getElementById('persona-sdk')) {
      const script = document.createElement('script');
      script.id = 'persona-sdk';
      script.src = 'https://cdn.withpersona.com/dist/persona-v5.1.0.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Start or resume KYC verification
  const handleStartVerification = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/kyc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start verification');
      }

      if (data.status === 'passed') {
        setStatus('passed');
        return;
      }

      // Open Persona widget
      if (window.Persona) {
        const client = new window.Persona.Client({
          inquiryId: data.inquiry_id,
          sessionToken: data.session_token,
          environment: personaEnvironment,
          onComplete: (inquiryId, status) => {
            console.log('Persona completed:', inquiryId, status);
            // Refresh status
            checkStatus();
          },
          onCancel: () => {
            setStatus('pending');
          },
          onError: (error) => {
            console.error('Persona error:', error);
            setError('Verification failed. Please try again.');
          },
        });

        client.open();
        setStatus('initiated');
      } else {
        throw new Error('Verification widget not loaded. Please refresh the page.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setIsStarting(false);
    }
  };

  // Check current status
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/kyc/start');
      const data = await response.json();

      if (response.ok) {
        setStatus(data.status as KYCStatus);

        if (data.status === 'passed') {
          onComplete?.('passed');
        } else if (data.status === 'failed') {
          onComplete?.('failed');
        }
      }
    } catch {
      // Ignore errors
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-lightest rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Passed */}
      {status === 'passed' && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-success">Identity Verified</h3>
              <p className="text-sm text-dark">Your identity has been successfully verified.</p>
            </div>
          </div>
        </div>
      )}

      {/* Failed */}
      {status === 'failed' && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-error">Verification Failed</h3>
              <p className="text-sm text-dark">We were unable to verify your identity. Please try again or contact support.</p>
            </div>
            <Button onClick={handleStartVerification} disabled={isStarting}>
              {isStarting ? 'Starting...' : 'Try Again'}
            </Button>
          </div>
        </div>
      )}

      {/* Requires Review */}
      {status === 'requires_review' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-700">Under Review</h3>
              <p className="text-sm text-dark">Your verification is being reviewed by our team. This typically takes 1-2 business days.</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-700">Verification in Progress</h3>
              <p className="text-sm text-dark">Your identity is being verified. This usually takes a few minutes.</p>
            </div>
            <Button variant="outline" onClick={checkStatus}>
              Check Status
            </Button>
          </div>
        </div>
      )}

      {/* Not Started / Pending */}
      {(status === 'not_started' || status === 'pending' || status === 'initiated') && (
        <div className="bg-lightest rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-light flex items-center justify-center">
              <svg className="w-6 h-6 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-darkest">Verify Your Identity</h3>
              <p className="text-sm text-dark">
                {status === 'pending' || status === 'initiated'
                  ? 'Continue your identity verification to start investing.'
                  : 'Complete identity verification to start investing. This takes about 2 minutes.'}
              </p>
            </div>
            <Button onClick={handleStartVerification} disabled={isStarting}>
              {isStarting ? 'Starting...' : status === 'not_started' ? 'Start Verification' : 'Continue Verification'}
            </Button>
          </div>
        </div>
      )}

      {/* Expired */}
      {status === 'expired' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-700">Verification Expired</h3>
              <p className="text-sm text-dark">Your verification session has expired. Please start a new verification.</p>
            </div>
            <Button onClick={handleStartVerification} disabled={isStarting}>
              {isStarting ? 'Starting...' : 'Start New Verification'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-medium text-center">
        Identity verification is powered by Persona. Your information is encrypted and securely stored.
      </p>
    </div>
  );
}
