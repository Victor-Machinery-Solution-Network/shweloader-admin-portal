import { createService } from "@/lib/api";
import type { ProductBrand } from "@/types/brand";

export const brandService = createService<ProductBrand>("product_brand", {
  primaryKey: "brand_id",
});
