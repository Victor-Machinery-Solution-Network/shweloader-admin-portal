import { getCachedLocations } from "@/lib/cache";
import { LocationsClient } from "@/components/features/locations/locations-client";


export const metadata = {
  title: "Locations",
  description: "Manage locations",
};

export default async function LocationsPage() {
  const locations = await getCachedLocations();

  return <LocationsClient locations={locations} />;
}
