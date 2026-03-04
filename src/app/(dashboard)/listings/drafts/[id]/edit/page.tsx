import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { SETTING_KEYS } from "@/types/setting";
import {
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
import { getDraftById, getProductImages } from "@/lib/actions/listing";
import { ListingEditor } from "@/components/features/listings/shared/listing-editor";
import { EditorSkeleton } from "@/components/features/listings/shared/editor-skeleton";

export const metadata = {
  title: "Edit Draft",
  description: "Edit a draft listing",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditDraftContent params={params} />
    </Suspense>
  );
}

async function EditDraftContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    draft,
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
    getDraftById(Number(id)),
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

  if (!draft) notFound();

  const images = await getProductImages(draft.id);

  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return (
    <ListingEditor
      pageType="sale"
      draft={draft}
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
