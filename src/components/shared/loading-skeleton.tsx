/**
 * Loading skeleton components
 */

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton matching the DataTable layout exactly: add button, search bar,
 * table (header + rows using real table elements), and pagination footer.
 * Used as the Suspense fallback so only the data area shows a skeleton
 * while the PageHeader above remains visible.
 */
export function DataTableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-4">
      {/* Toolbar: search + add button in same row (matches DataTable toolbar) */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/50 [&_tr]:border-b">
              <tr className="border-b">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="h-12 px-3 text-left align-middle">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: columns }).map((_, j) => (
                    <td key={j} className="p-3 align-middle">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-[4.375rem]" />
          <Skeleton className="h-4 w-20" />
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton matching the BrandCard list layout: search bar + card placeholders.
 */
export function BrandCardSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-4">
      {/* Toolbar: search + add button */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="ring-foreground/10 flex items-center gap-4 rounded-2xl px-5 py-4 ring-1"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5 pl-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-24 rounded-full" />
              ))}
            </div>
            <Skeleton className="size-5 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
