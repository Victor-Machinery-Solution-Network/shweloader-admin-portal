import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { SETTING_KEYS } from "@/types/setting";
import {
  getSaleListingById,
  getListingImages,
  getApprovedPartners,
  getEquipmentModels,
  getAttachmentModels,
  getLocations,
  getConditionTypes,
  getSettings,
  getCustomFieldTemplates,
} from "@/lib/cache";
import { ListingEditor } from "@/components/features/listings/shared/listing-editor";
import { EditorSkeleton } from "@/components/features/listings/shared/editor-skeleton";

export const metadata = {
  title: "Edit Sale Listing",
  description: "Edit an existing sale listing",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditSaleListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditSaleListingContent params={params} />
    </Suspense>
  );
}

async function EditSaleListingContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    listing,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
    conditionTypes,
    settings,
    templates,
  ] = await Promise.all([
    getSaleListingById(Number(id)),
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getLocations(),
    getConditionTypes(),
    getSettings(),
    getCustomFieldTemplates(),
  ]);

  if (!listing) notFound();

  const images = await getListingImages(listing.product_list_id);

  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return (
    <ListingEditor
      pageType="sale"
      listing={listing}
      existingImages={images}
      partners={partners}
      equipmentModels={equipmentModels}
      attachmentModels={attachmentModels}
      locations={locations}
      conditionTypes={conditionTypes}
      exchangeRate={exchangeRate}
      templates={templates}
    />
  );
}
