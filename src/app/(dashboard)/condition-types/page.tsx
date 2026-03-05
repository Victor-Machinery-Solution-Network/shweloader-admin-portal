import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getConditionTypes } from "@/lib/cache";
import { ConditionTypesClient } from "@/components/features/condition-types/condition-types-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Sale Conditions",
  description: "Manage sale condition types for listings.",
};

export default function ConditionTypesPage() {
  return (
    <>
      <PageHeader
        title="Sale Conditions"
        description="Manage sale condition types for listings."
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="condition_types">
          <ConditionTypesContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function ConditionTypesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.CONDITION_TYPES);

  const conditionTypes = await getConditionTypes();

  return <ConditionTypesClient conditionTypes={conditionTypes} />;
}
