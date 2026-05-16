import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getPopupPromotions } from "@/lib/cache";
import { PopupPromotionsClient } from "@/components/features/popup-promotions/popup-promotions-client";

export const metadata = {
  title: "Popup Promotions",
  description: "Manage in-app popup promotional ads",
};

export default function PopupPromotionsPage() {
  return (
    <>
      <PageHeader
        title="Popup Promotions"
        description="In-app popup ads shown inside the mobile app on Home, Browse and Subcategory screens."
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="popup_promotions">
          <Content />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function Content() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.POPUP_PROMOTIONS);

  const promotions = await getPopupPromotions();
  return <PopupPromotionsClient promotions={promotions} />;
}
