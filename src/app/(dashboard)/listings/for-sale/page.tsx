import { unstable_cache } from "next/cache";
import {
  getSaleListingsWithDetails,
  getFeaturedListingsWithDetails,
  getApprovedPartners,
} from "@/lib/actions/listing";
import { equipmentModelService } from "@/lib/services/equipment";
import { attachmentModelService } from "@/lib/services/attachment";
import { locationService } from "@/lib/services/location";
import { ListingsClient } from "@/components/features/listings/shared/listings-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Listings For Sale",
  description: "Manage sale listings and featured items",
};

const getCachedPartners = unstable_cache(
  () => getApprovedPartners(),
  ["approved-partners"],
  { revalidate: 120, tags: ["partners"] },
);

const getCachedEquipmentModels = unstable_cache(
  () => equipmentModelService.list({ sort_by: "name", order: "asc" }),
  ["equipment-models-list"],
  { revalidate: 120, tags: ["equipment-models"] },
);

const getCachedAttachmentModels = unstable_cache(
  () => attachmentModelService.list({ sort_by: "name", order: "asc" }),
  ["attachment-models-list"],
  { revalidate: 120, tags: ["attachment-models"] },
);

const getCachedLocations = unstable_cache(
  () => locationService.list({ sort_by: "city_name", order: "asc" }),
  ["locations-list"],
  { revalidate: 300, tags: ["locations"] },
);

export default async function ListingsForSalePage() {
  const [
    listings,
    featured,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
  ] = await Promise.all([
    getSaleListingsWithDetails(),
    getFeaturedListingsWithDetails(),
    getCachedPartners(),
    getCachedEquipmentModels(),
    getCachedAttachmentModels(),
    getCachedLocations(),
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
