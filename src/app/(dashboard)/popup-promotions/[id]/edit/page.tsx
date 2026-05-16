import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PopupPromotionForm } from "@/components/features/popup-promotions/popup-promotion-form";
import { getPopupListingOptions, getPopupPromotion } from "@/lib/cache";

export const metadata = {
  title: "Edit Popup Promotion",
  description: "Edit an in-app popup promotion",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default async function EditPopupPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <PermissionGate feature="popup_promotions" permission="edit">
        <Content id={Number(id)} />
      </PermissionGate>
    </Suspense>
  );
}

async function Content({ id }: { id: number }) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(CACHE_TAGS.POPUP_PROMOTIONS);

  const [promo, listings] = await Promise.all([
    getPopupPromotion(id),
    getPopupListingOptions(),
  ]);
  if (!promo) notFound();
  return <PopupPromotionForm listings={listings} promotion={promo} />;
}
