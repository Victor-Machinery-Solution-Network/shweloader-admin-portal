import {
  getCachedSaleListings,
  getCachedFeaturedListings,
  getCachedApprovedPartners,
  getCachedEquipmentModels,
  getCachedAttachmentModels,
  getCachedLocations,
} from "@/lib/cache";
import { ListingsClient } from "@/components/features/listings/shared/listings-client";

export const metadata = {
  title: "Listings For Sale",
  description: "Manage sale listings and featured items",
};

export default async function ListingsForSalePage() {
  const [
    listings,
    featured,
    partners,
    equipmentModels,
    attachmentModels,
    locations,
  ] = await Promise.all([
    getCachedSaleListings(),
    getCachedFeaturedListings(),
    getCachedApprovedPartners(),
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
