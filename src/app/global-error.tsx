'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-4 flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
            <p className="text-gray-500 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 mb-4">
                Error ID: {error.digest}
              </p>
            )}
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
