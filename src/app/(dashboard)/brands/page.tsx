import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { BrandCardSkeleton } from "@/components/shared/loading-skeleton";
import {
  getBrands,
  getAttachmentCategories,
  getSubCategories,
  getMainCategories,
} from "@/lib/cache";
import {
  getBrandsCategoryIds,
  getBrandsSubCategoryIds,
  getBrandLinkedCounts,
  formatBrandLinkedSummary,
} from "@/lib/actions/brand";
import { BrandsClient } from "@/components/features/brands/brands-client";
import { PermissionGate } from "@/components/shared/permission-gate";
import type { ProductBrandWithCategories } from "@/types/brand";


export const metadata = {
  title: "Brands",
  description: "Manage equipment & attachment mappings",
};

export default function BrandsPage() {
  return (
    <>
      <PageHeader title="Brands" description="Manage equipment & attachment mappings" />
      <Suspense fallback={<BrandCardSkeleton />}>
        <PermissionGate feature="brands">
          <BrandsContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function BrandsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(
    CACHE_TAGS.BRANDS,
    CACHE_TAGS.ATTACHMENT_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES,
  );

  const [brands, categories, subCategories, mainCategories] = await Promise.all([
    getBrands(),
    getAttachmentCategories(),
    getSubCategories(),
    getMainCategories(),
  ]);

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
      mainCategories={mainCategories}
      linkedInfo={linkedInfo}
    />
  );
}
