import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="-m-6 flex h-[calc(100svh-3rem)] flex-col">
      {/* Sticky header */}
      <div className="border-b px-6 py-3">
        {/* Breadcrumb */}
        <div className="mb-1 flex items-center gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="size-3" />
          <Skeleton className="h-3 w-10" />
        </div>
        {/* Title + actions */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-18" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Step indicator */}
        <div className="mx-auto mt-3 flex max-w-sm items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex items-center${i < 2 ? " flex-1" : ""}`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
              {i < 2 && (
                <Skeleton className="mx-3 mb-5 h-0.5 flex-1 rounded-full" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
          {/* Product type pill */}
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-56 rounded-full" />
          </div>

          {/* Model combobox */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>

          {/* Listing type cards */}
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t px-6 py-3">
        <div className="mx-auto flex max-w-2xl justify-end">
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
