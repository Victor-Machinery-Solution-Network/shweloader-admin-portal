import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import {
  getSaleListings,
  getFeaturedListings,
  getApprovedPartners,
  getEquipmentModels,
  getAttachmentModels,
  getLocations,
  getConditionTypes,
  getSettings,
} from "@/lib/cache";
import { SETTING_KEYS } from "@/types/setting";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { ListingsClient } from "@/components/features/listings/shared/listings-client";

export const metadata = {
  title: "Listings For Sale",
  description: "Manage sale listings and featured items",
};

export default function ListingsForSalePage() {
  return (
    <>
      <PageHeader
        title="Listings For Sale"
        description="Manage sale listings and featured items"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <SaleListingsContent />
      </Suspense>
    </>
  );
}

async function SaleListingsContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.PARTNERS,
    CACHE_TAGS.EQUIPMENT_MODELS,
    CACHE_TAGS.ATTACHMENT_MODELS,
    CACHE_TAGS.LOCATIONS,
    CACHE_TAGS.CONDITION_TYPES,
    CACHE_TAGS.SETTINGS,
  );

  const [
    listings,
    featured,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
    conditionTypes,
    settings,
  ] = await Promise.all([
    getSaleListings(),
    getFeaturedListings(),
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getLocations(),
    getConditionTypes(),
    getSettings(),
  ]);

  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return (
    <ListingsClient
      pageType="sale"
      listings={listings}
      featured={featured}
      partners={partners}
      equipmentModels={equipmentModels}
      attachmentModels={attachmentModels}
      locations={locations}
      conditionTypes={conditionTypes}
      exchangeRate={exchangeRate}
    />
  );
}
