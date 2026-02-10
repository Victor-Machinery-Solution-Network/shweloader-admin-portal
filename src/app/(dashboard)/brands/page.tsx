import { brandService } from "@/lib/services/brand";
import { attachmentCategoryService } from "@/lib/services/attachment";
import { subCategoryService } from "@/lib/services/equipment";
import {
  getBrandsCategoryIds,
  getBrandsSubCategoryIds,
} from "@/lib/actions/brand";
import { BrandsClient } from "@/components/features/brands/brands-client";
import type { ProductBrandWithCategories } from "@/types/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Brands",
  description: "Manage product brands",
};

export default async function BrandsPage() {
  const [brands, categories, subCategories] = await Promise.all([
    brandService.list({ sort_by: "name", order: "asc" }),
    attachmentCategoryService.list({
      sort_by: "display_order",
      order: "asc",
    }),
    subCategoryService.list({
      sort_by: "name",
      order: "asc",
    }),
  ]);

  // Fetch category & sub-category links for all brands in parallel
  const brandIds = brands.map((b) => b.brand_id);
  const [categoryIdMap, subCategoryIdMap] = await Promise.all([
    getBrandsCategoryIds(brandIds),
    getBrandsSubCategoryIds(brandIds),
  ]);

  const brandsWithCategories: ProductBrandWithCategories[] = brands.map(
    (brand) => ({
      ...brand,
      categoryIds: categoryIdMap[brand.brand_id] ?? [],
      subCategoryIds: subCategoryIdMap[brand.brand_id] ?? [],
    }),
  );

  return (
    <BrandsClient
      brands={brandsWithCategories}
      categories={categories}
      subCategories={subCategories}
    />
  );
}
