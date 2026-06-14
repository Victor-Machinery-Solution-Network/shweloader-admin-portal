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
  getCategorySubCategoryLinks,
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
import { EditorHtmlLock } from "@/components/features/listings/shared/editor-html-lock";
import { PermissionGate } from "@/components/shared/permission-gate";

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
      <PermissionGate feature={["sale_listings", "rent_listings"]} permission="create">
        <EditDraftContent params={params} />
      </PermissionGate>
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
    categorySubCategoryLinks,
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
    getCategorySubCategoryLinks(),
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
    <div className="flex flex-1 min-h-0 flex-col">
      <EditorHtmlLock />
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
        attachmentCategorySubCategoryLinks={categorySubCategoryLinks}
        stateRegions={stateRegions}
        districts={districts}
        townships={townships}
        conditionTypes={conditionTypes}
        exchangeRate={exchangeRate}
        templates={templates}
      />
    </div>
  );
}
