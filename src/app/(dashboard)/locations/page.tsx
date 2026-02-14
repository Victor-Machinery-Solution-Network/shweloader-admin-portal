import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getLocations } from "@/lib/cache";
import { getListingCount } from "@/lib/actions/location";
import { LocationsClient } from "@/components/features/locations/locations-client";


export const metadata = {
  title: "Locations",
  description: "Manage locations",
};

export default function LocationsPage() {
  return (
    <>
      <PageHeader title="Locations" description="Manage locations" />
      <Suspense fallback={<DataTableSkeleton />}>
        <LocationsContent />
      </Suspense>
    </>
  );
}

async function LocationsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.LOCATIONS);

  const locations = await getLocations();
  const linkedCounts = await getListingCount(
    locations.map((l) => l.location_id),
  );

  return (
    <LocationsClient locations={locations} linkedCounts={linkedCounts} />
  );
}
