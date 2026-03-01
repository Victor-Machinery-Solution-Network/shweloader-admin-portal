import { createService } from "@/lib/api";
import type { ProductBrand } from "@/types/brand";

export const brandService = createService<ProductBrand, "brand_id">(
  "product_brand",
  { primaryKey: "brand_id", softDelete: true },
);
