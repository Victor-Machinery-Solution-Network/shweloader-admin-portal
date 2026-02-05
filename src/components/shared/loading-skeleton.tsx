/**
 * Loading skeleton components
 */

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-4 w-1/4 mb-2" />
      <Skeleton className="h-8 w-1/3 mb-4" />
      <Skeleton className="h-4 w-full" />
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
