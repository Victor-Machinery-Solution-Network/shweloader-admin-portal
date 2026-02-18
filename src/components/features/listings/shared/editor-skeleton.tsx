import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({
  iconColor,
  children,
}: {
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <Skeleton className={`size-8 rounded-lg ${iconColor}`} />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="-m-6 flex h-[calc(100svh-3rem)] flex-col">
      {/* Sticky header */}
      <div className="border-b px-6 py-3">
        <div className="mb-1 flex items-center gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="size-3" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-18" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-10 px-6 py-8">
          {/* Classification */}
          <SectionSkeleton iconColor="bg-amber-500/10">
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-56 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </SectionSkeleton>

          <Skeleton className="h-px w-full" />

          {/* Product */}
          <SectionSkeleton iconColor="bg-blue-500/10">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-18" />
              <Skeleton className="h-9 w-full" />
            </div>
          </SectionSkeleton>

          <Skeleton className="h-px w-full" />

          {/* Pricing */}
          <SectionSkeleton iconColor="bg-emerald-500/10">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-48 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          </SectionSkeleton>

          <Skeleton className="h-px w-full" />

          {/* Media */}
          <SectionSkeleton iconColor="bg-violet-500/10">
            <Skeleton className="size-48 rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="aspect-square rounded-lg" />
            </div>
          </SectionSkeleton>

          <Skeleton className="h-px w-full" />

          {/* Details */}
          <SectionSkeleton iconColor="bg-slate-500/10">
            <Skeleton className="h-40 w-full rounded-lg" />
          </SectionSkeleton>
        </div>
      </div>
    </div>
  );
}
