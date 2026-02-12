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
    getApprovedPartners(),
    equipmentModelService.list({ sort_by: "name", order: "asc" }),
    attachmentModelService.list({ sort_by: "name", order: "asc" }),
    locationService.list({ sort_by: "city_name", order: "asc" }),
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
