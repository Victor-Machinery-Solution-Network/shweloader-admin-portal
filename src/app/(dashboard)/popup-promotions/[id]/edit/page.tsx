import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PopupPromotionForm } from "@/components/features/popup-promotions/popup-promotion-form";
import {
  findMockPromotion,
  MOCK_LISTINGS,
} from "@/components/features/popup-promotions/mock-data";

export const metadata = {
  title: "Edit Popup Promotion",
  description: "Edit an existing popup promotion",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditPopupPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <EditPopupPromotionContent params={params} />
    </Suspense>
  );
}

async function EditPopupPromotionContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promotion = findMockPromotion(Number(id));
  if (!promotion) notFound();
  return (
    <PopupPromotionForm promotion={promotion} listings={MOCK_LISTINGS} />
  );
}
