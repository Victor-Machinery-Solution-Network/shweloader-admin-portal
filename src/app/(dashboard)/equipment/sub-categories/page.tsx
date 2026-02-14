import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getSubCategories, getMainCategories } from "@/lib/cache";
import {
  getSubCategoryLinkedCounts,
  formatSubCategoryLinkedSummary,
} from "@/lib/actions/equipment";
import { SubCategoriesClient } from "@/components/features/equipment/sub/sub-categories-client";


export const metadata = {
  title: "Sub Categories | Equipment",
  description: "Manage equipment sub categories",
};

export default function EquipmentSubCategoriesPage() {
  return (
    <>
      <PageHeader
        title="Sub Categories"
        description="Manage equipment sub categories"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <SubCategoriesContent />
      </Suspense>
    </>
  );
}

async function SubCategoriesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);

  const [subCategories, categories] = await Promise.all([
    getSubCategories(),
    getMainCategories(),
  ]);

  const countsMap = await getSubCategoryLinkedCounts(
    subCategories.map((s) => s.sub_category_id),
  );

  const linkedInfo: Record<number, { total: number; summary: string }> = {};
  for (const [id, c] of Object.entries(countsMap)) {
    linkedInfo[Number(id)] = {
      total: c.total,
      summary: c.total > 0 ? await formatSubCategoryLinkedSummary(c) : "",
    };
  }

  return (
    <SubCategoriesClient
      subCategories={subCategories}
      categories={categories}
      linkedInfo={linkedInfo}
    />
  );
}
