import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getTrashPageData } from "@/lib/actions/trash";
import { TrashClient } from "@/components/features/trash/trash-client";

export const metadata = {
  title: "Trash",
  description: "Recover or permanently delete items",
};

export default function TrashPage() {
  return (
    <>
      <PageHeader
        title="Trash"
        description="Deleted items are kept for 30 days before being permanently removed"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="trash">
          <TrashContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function TrashContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.TRASH);

  const { items, counts } = await getTrashPageData();

  return <TrashClient items={items} counts={counts} />;
}
