import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PopupPromotionsClient } from "@/components/features/popup-promotions/popup-promotions-client";
import { MOCK_PROMOTIONS } from "@/components/features/popup-promotions/mock-data";

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
        <PopupPromotionsContent />
      </Suspense>
    </>
  );
}

async function PopupPromotionsContent() {
  "use cache";
  // UI-only prototype — using mock data, no D1 calls.
  const promotions = MOCK_PROMOTIONS;
  return <PopupPromotionsClient promotions={promotions} />;
}
