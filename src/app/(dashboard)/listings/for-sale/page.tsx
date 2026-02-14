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
} from "@/lib/cache";
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
  );

  const [
    listings,
    featured,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
  ] = await Promise.all([
    getSaleListings(),
    getFeaturedListings(),
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getLocations(),
  ]);

  return (
    <ListingsClient
      pageType="sale"
      listings={listings}
      featured={featured}
      partners={partners}
      equipmentModels={equipmentModels}
      attachmentModels={attachmentModels}
      locations={locations}
    />
  );
}
