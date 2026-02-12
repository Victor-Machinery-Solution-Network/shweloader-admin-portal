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

export function TablePageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* PageHeader skeleton */}
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Search bar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-72" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border">
        <div className="p-4 space-y-3">
          <div className="flex gap-4 pb-3 border-b">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
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
