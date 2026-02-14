import {
  getCachedRentListings,
  getCachedFeaturedListings,
  getCachedApprovedPartners,
  getCachedEquipmentModels,
  getCachedAttachmentModels,
  getCachedLocations,
} from "@/lib/cache";
import { ListingsClient } from "@/components/features/listings/shared/listings-client";

export const metadata = {
  title: "Listings For Rent",
  description: "Manage rental listings and featured items",
};

export default async function ListingsForRentPage() {
  const [
    listings,
    featured,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
  ] = await Promise.all([
    getCachedRentListings(),
    getCachedFeaturedListings(),
    getCachedApprovedPartners(),
    getCachedEquipmentModels(),
    getCachedAttachmentModels(),
    getCachedLocations(),
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
    />
  );
}
