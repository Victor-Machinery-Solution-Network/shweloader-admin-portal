import { getCachedLocations } from "@/lib/cache";
import { getListingCount } from "@/lib/actions/location";
import { LocationsClient } from "@/components/features/locations/locations-client";


export const metadata = {
  title: "Locations",
  description: "Manage locations",
};

export default async function LocationsPage() {
  const locations = await getCachedLocations();
  const linkedCounts = await getListingCount(
    locations.map((l) => l.location_id),
  );

  return (
    <LocationsClient locations={locations} linkedCounts={linkedCounts} />
  );
}
