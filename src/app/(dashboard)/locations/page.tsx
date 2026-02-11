import { locationService } from "@/lib/services/location";
import { LocationsClient } from "@/components/features/locations/locations-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Locations",
  description: "Manage locations",
};

export default async function LocationsPage() {
  const locations = await locationService.list({
    sort_by: "city_name",
    order: "asc",
  });

  return <LocationsClient locations={locations} />;
}
