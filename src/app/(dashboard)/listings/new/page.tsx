import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
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
import { ListingEditor } from "@/components/features/listings/shared/listing-editor";
import { EditorSkeleton } from "@/components/features/listings/shared/editor-skeleton";
import { EditorHtmlLock } from "@/components/features/listings/shared/editor-html-lock";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "New Listing",
  description: "Create a new listing",
};

export default function NewListingPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PermissionGate feature={["sale_listings", "rent_listings"]} permission="create">
        <NewListingContent />
      </PermissionGate>
    </Suspense>
  );
}

async function NewListingContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(
    CACHE_TAGS.PARTNERS,
    CACHE_TAGS.EQUIPMENT_MODELS,
    CACHE_TAGS.ATTACHMENT_MODELS,
    CACHE_TAGS.BRANDS,
    CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES,
    CACHE_TAGS.ATTACHMENT_CATEGORIES,
    CACHE_TAGS.LOCATIONS,
    CACHE_TAGS.CONDITION_TYPES,
    CACHE_TAGS.SETTINGS,
    CACHE_TAGS.CUSTOM_FIELD_TEMPLATES,
  );

  const [
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

  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <EditorHtmlLock />
      <ListingEditor
        pageType="sale"
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
