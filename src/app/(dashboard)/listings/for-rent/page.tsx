import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import {
  getRentListings,
  getFeaturedListings,
  getApprovedPartners,
  getEquipmentModels,
  getAttachmentModels,
  getLocations,
  getConditionTypes,
} from "@/lib/cache";
import { ListingsClient } from "@/components/features/listings/shared/listings-client";

export const metadata = {
  title: "Listings For Rent",
  description: "Manage rental listings and featured items",
};

export default function ListingsForRentPage() {
  return (
    <>
      <PageHeader
        title="Listings For Rent"
        description="Manage rental listings and featured items"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <RentListingsContent />
      </Suspense>
    </>
  );
}

async function RentListingsContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.PARTNERS,
    CACHE_TAGS.EQUIPMENT_MODELS,
    CACHE_TAGS.ATTACHMENT_MODELS,
    CACHE_TAGS.LOCATIONS,
    CACHE_TAGS.CONDITION_TYPES,
  );

  const [
    listings,
    featured,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
    conditionTypes,
  ] = await Promise.all([
    getRentListings(),
    getFeaturedListings(),
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getLocations(),
    getConditionTypes(),
  ]);

  return (
    <ListingsClient
      pageType="rent"
      listings={listings}
      featured={featured}
      partners={partners}
      equipmentModels={equipmentModels}
      attachmentModels={attachmentModels}
      locations={locations}
      conditionTypes={conditionTypes}
    />
  );
}
