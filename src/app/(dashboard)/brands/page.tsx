import {
  getCachedBrands,
  getCachedAttachmentCategories,
  getCachedSubCategories,
} from "@/lib/cache";
import {
  getBrandsCategoryIds,
  getBrandsSubCategoryIds,
  getBrandLinkedCounts,
  formatBrandLinkedSummary,
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

  // Fetch category & sub-category links + delete-linked counts for all brands in parallel
  const brandIds = brands.map((b) => b.brand_id);
  const [categoryIdMap, subCategoryIdMap, countsMap] = await Promise.all([
    getBrandsCategoryIds(brandIds),
    getBrandsSubCategoryIds(brandIds),
    getBrandLinkedCounts(brandIds),
  ]);

  const brandsWithCategories: ProductBrandWithCategories[] = brands.map(
    (brand) => ({
      ...brand,
      categoryIds: categoryIdMap[brand.brand_id] ?? [],
      subCategoryIds: subCategoryIdMap[brand.brand_id] ?? [],
    }),
  );

  const linkedInfo: Record<number, { total: number; summary: string }> = {};
  for (const [id, c] of Object.entries(countsMap)) {
    linkedInfo[Number(id)] = {
      total: c.total,
      summary: c.total > 0 ? await formatBrandLinkedSummary(c) : "",
    };
  }

  return (
    <BrandsClient
      brands={brandsWithCategories}
      categories={categories}
      subCategories={subCategories}
      linkedInfo={linkedInfo}
    />
  );
}
