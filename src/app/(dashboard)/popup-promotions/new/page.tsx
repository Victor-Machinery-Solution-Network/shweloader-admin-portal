import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PopupPromotionForm } from "@/components/features/popup-promotions/popup-promotion-form";
import { MOCK_LISTINGS } from "@/components/features/popup-promotions/mock-data";

export const metadata = {
  title: "New Popup Promotion",
  description: "Create a new in-app popup promotion",
};

export default function NewPopupPromotionPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <NewPopupPromotionContent />
    </Suspense>
  );
}

async function NewPopupPromotionContent() {
  "use cache";
  const listings = MOCK_LISTINGS;
  return <PopupPromotionForm listings={listings} />;
}
