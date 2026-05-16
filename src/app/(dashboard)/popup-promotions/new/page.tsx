import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PopupPromotionForm } from "@/components/features/popup-promotions/popup-promotion-form";
import { getPopupListingOptions } from "@/lib/cache";

export const metadata = {
  title: "New Popup Promotion",
  description: "Create a new in-app popup promotion",
};

export default function NewPopupPromotionPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <PermissionGate feature="popup_promotions" permission="create">
        <Content />
      </PermissionGate>
    </Suspense>
  );
}

async function Content() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  const listings = await getPopupListingOptions();
  return <PopupPromotionForm listings={listings} />;
}
