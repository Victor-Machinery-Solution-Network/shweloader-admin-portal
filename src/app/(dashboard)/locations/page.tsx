import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getLocationsPageData } from "@/lib/actions/location";
import { LocationsClient } from "@/components/features/locations/locations-client";
import { PermissionGate } from "@/components/shared/permission-gate";


export const metadata = {
  title: "Locations",
  description: "Manage locations",
};

export default function LocationsPage() {
  return (
    <>
      <PageHeader title="Locations" description="Manage Myanmar locations (State/Region, District, Township)" />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="locations">
          <LocationsContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function LocationsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.LOCATIONS);

  const { townships, stateRegions, districts, districtsWithParents, listingCounts, districtCounts, townshipCounts } =
    await getLocationsPageData();

  return (
    <LocationsClient
      townships={townships}
      stateRegions={stateRegions}
      districts={districts}
      districtsWithParents={districtsWithParents}
      listingCounts={listingCounts}
      districtCounts={districtCounts}
      townshipCounts={townshipCounts}
    />
  );
}
