import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { SETTING_KEYS } from "@/types/setting";
import {
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
  title: "New Rent Listing",
  description: "Create a new listing for rent",
};

export default function NewRentListingPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewRentListingContent />
    </Suspense>
  );
}

async function NewRentListingContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(
    CACHE_TAGS.PARTNERS,
    CACHE_TAGS.EQUIPMENT_MODELS,
    CACHE_TAGS.ATTACHMENT_MODELS,
    CACHE_TAGS.LOCATIONS,
    CACHE_TAGS.CONDITION_TYPES,
    CACHE_TAGS.SETTINGS,
    CACHE_TAGS.CUSTOM_FIELD_TEMPLATES,
  );

  const [
    partners,
    equipmentModels,
    attachmentModels,
    locations,
    conditionTypes,
    settings,
    templates,
  ] = await Promise.all([
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getLocations(),
    getConditionTypes(),
    getSettings(),
    getCustomFieldTemplates(),
  ]);

  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return (
    <ListingEditor
      pageType="rent"
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
