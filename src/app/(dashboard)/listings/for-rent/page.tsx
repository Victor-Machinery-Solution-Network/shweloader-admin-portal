import {
  getRentListingsWithDetails,
  getFeaturedListingsWithDetails,
  getApprovedPartners,
} from "@/lib/actions/listing";
import { equipmentModelService } from "@/lib/services/equipment";
import { attachmentModelService } from "@/lib/services/attachment";
import { locationService } from "@/lib/services/location";
import { ListingsClient } from "@/components/features/listings/shared/listings-client";

export const dynamic = "force-dynamic";

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
    getRentListingsWithDetails(),
    getFeaturedListingsWithDetails(),
    getApprovedPartners(),
    equipmentModelService.list({ sort_by: "name", order: "asc" }),
    attachmentModelService.list({ sort_by: "name", order: "asc" }),
    locationService.list({ sort_by: "city_name", order: "asc" }),
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
