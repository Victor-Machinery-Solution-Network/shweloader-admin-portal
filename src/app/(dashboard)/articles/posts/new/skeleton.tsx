import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="-m-6 flex h-[calc(100svh-3rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <Skeleton className="h-5 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left column */}
        <div className="flex flex-1 flex-col gap-4 p-8">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="min-h-0 flex-1" />
        </div>

        {/* Right column */}
        <div className="w-80 shrink-0 border-l bg-muted/30 p-6">
          <Skeleton className="mb-4 h-4 w-16" />
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
