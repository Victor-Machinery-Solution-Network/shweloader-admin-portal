import { createService } from "@/lib/api/create-service";
import type {
  ProductList,
  ProductImage,
  SaleListing,
  RentListing,
  FeaturedListing,
} from "@/types/listing";

export const productListService = createService<ProductList>("product_list", {
  primaryKey: "id",
});

export const productImageService = createService<ProductImage>(
  "product_image",
  { primaryKey: "image_id" },
);

export const saleListingService = createService<SaleListing>("sale_listing", {
  primaryKey: "id",
});

export const rentListingService = createService<RentListing>("rent_listing", {
  primaryKey: "id",
});

export const featuredListingService = createService<FeaturedListing>(
  "featured_listing",
  { primaryKey: "id" },
);
