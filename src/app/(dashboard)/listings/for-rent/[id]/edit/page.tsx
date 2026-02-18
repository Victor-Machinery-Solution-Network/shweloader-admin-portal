import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { SETTING_KEYS } from "@/types/setting";
import {
  getRentListingById,
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
  title: "Edit Rent Listing",
  description: "Edit an existing rent listing",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditRentListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditRentListingContent params={params} />
    </Suspense>
  );
}

async function EditRentListingContent({
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
    getRentListingById(Number(id)),
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
      pageType="rent"
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
