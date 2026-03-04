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
  getBrands,
  getMainCategories,
  getSubCategories,
  getSubCategoryBrandLinks,
  getAttachmentCategories,
  getCategoryBrandLinks,
  getStateRegions,
  getDistricts,
  getTownships,
  getConditionTypes,
  getSettings,
  getCustomFieldTemplates,
} from "@/lib/cache";
import { ListingEditor } from "@/components/features/listings/shared/listing-editor";
import { EditorSkeleton } from "@/components/features/listings/shared/editor-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";

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
      <PermissionGate feature="rent_listings">
        <EditRentListingContent params={params} />
      </PermissionGate>
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
    brands,
    mainCategories,
    subCategories,
    subCategoryBrandLinks,
    attachmentCategories,
    categoryBrandLinks,
    stateRegions,
    districts,
    townships,
    conditionTypes,
    settings,
    templates,
  ] = await Promise.all([
    getRentListingById(Number(id)),
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getBrands(),
    getMainCategories(),
    getSubCategories(),
    getSubCategoryBrandLinks(),
    getAttachmentCategories(),
    getCategoryBrandLinks(),
    getStateRegions(),
    getDistricts(),
    getTownships(),
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
      brands={brands}
      mainCategories={mainCategories}
      subCategories={subCategories}
      subCategoryBrandLinks={subCategoryBrandLinks}
      attachmentCategories={attachmentCategories}
      categoryBrandLinks={categoryBrandLinks}
      stateRegions={stateRegions}
      districts={districts}
      townships={townships}
      conditionTypes={conditionTypes}
      exchangeRate={exchangeRate}
      templates={templates}
    />
  );
}
