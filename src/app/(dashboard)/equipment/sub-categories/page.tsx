import { getCachedSubCategories, getCachedMainCategories } from "@/lib/cache";
import {
  getSubCategoryLinkedCounts,
  formatSubCategoryLinkedSummary,
} from "@/lib/actions/equipment";
import { SubCategoriesClient } from "@/components/features/equipment/sub/sub-categories-client";


export const metadata = {
  title: "Sub Categories | Equipment",
  description: "Manage equipment sub categories",
};

export default async function EquipmentSubCategoriesPage() {
  const [subCategories, categories] = await Promise.all([
    getCachedSubCategories(),
    getCachedMainCategories(),
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
