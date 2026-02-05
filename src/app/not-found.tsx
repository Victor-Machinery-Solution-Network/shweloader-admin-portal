/**
 * Global 404 page
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-4">Page not found</h2>
        <p className="text-muted-foreground mb-6">
          The page you are looking for does not exist.
        </p>
        <Button asChild>
          <Link href={ROUTES.DASHBOARD}>Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
