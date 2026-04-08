import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getPromotionPushes } from "@/lib/cache";
import { PromotionClient } from "@/components/features/promotion/promotion-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Push Notifications",
  description: "Send push notifications to all devices",
};

export default function PromotionsPage() {
  return (
    <>
      <PageHeader
        title="Push Notifications"
        description="Send push notifications to all registered devices"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="promotions">
          <PromotionContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function PromotionContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.PROMOTION_PUSHES);

  const promotions = await getPromotionPushes();

  return <PromotionClient promotions={promotions} />;
}
