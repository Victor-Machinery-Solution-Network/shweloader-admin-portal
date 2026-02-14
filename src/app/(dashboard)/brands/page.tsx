import {
  getCachedBrands,
  getCachedAttachmentCategories,
  getCachedSubCategories,
} from "@/lib/cache";
import {
  getBrandsCategoryIds,
  getBrandsSubCategoryIds,
} from "@/lib/actions/brand";
import { BrandsClient } from "@/components/features/brands/brands-client";
import type { ProductBrandWithCategories } from "@/types/brand";


export const metadata = {
  title: "Brands",
  description: "Manage product brands",
};

export default async function BrandsPage() {
  const [brands, categories, subCategories] = await Promise.all([
    getCachedBrands(),
    getCachedAttachmentCategories(),
    getCachedSubCategories(),
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
