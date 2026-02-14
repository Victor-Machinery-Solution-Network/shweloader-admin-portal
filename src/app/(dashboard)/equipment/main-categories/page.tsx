import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getMainCategories } from "@/lib/cache";
import { getSubCategoryCount } from "@/lib/actions/equipment";
import { MainCategoriesClient } from "@/components/features/equipment/main/main-categories-client";


export const metadata = {
  title: "Main Categories | Equipment",
  description: "Manage equipment main categories",
};

export default function EquipmentMainCategoriesPage() {
  return (
    <>
      <PageHeader
        title="Main Categories"
        description="Manage equipment main categories"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <MainCategoriesContent />
      </Suspense>
    </>
  );
}

async function MainCategoriesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);

  const categories = await getMainCategories();
  const linkedCounts = await getSubCategoryCount(
    categories.map((c) => c.category_id),
  );

  return (
    <MainCategoriesClient categories={categories} linkedCounts={linkedCounts} />
  );
}
