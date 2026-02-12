import { unstable_cache } from "next/cache";
import { locationService } from "@/lib/services/location";
import { LocationsClient } from "@/components/features/locations/locations-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Locations",
  description: "Manage locations",
};

const getCachedLocations = unstable_cache(
  () => locationService.list({ sort_by: "city_name", order: "asc" }),
  ["locations-list"],
  { revalidate: 300, tags: ["locations"] },
);

export default async function LocationsPage() {
  const locations = await getCachedLocations();

  return <LocationsClient locations={locations} />;
}
