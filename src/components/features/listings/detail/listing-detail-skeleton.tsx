import { Skeleton } from "@/components/ui/skeleton";

export function ListingDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Skeleton className="h-5 w-32" />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      {/* Top section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
