import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import {
  getRentListings,
  getFeaturedListings,
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
        <PermissionGate feature="rent_listings">
          <RentListingsContent />
        </PermissionGate>
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
  );

  const [listings, featured] = await Promise.all([
    getRentListings(),
    getFeaturedListings(),
  ]);

  return (
    <ListingsClient
      pageType="rent"
      listings={listings}
      featured={featured}
    />
  );
}
