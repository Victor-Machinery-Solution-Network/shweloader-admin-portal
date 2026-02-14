import { getCachedMainCategories } from "@/lib/cache";
import { getSubCategoryCount } from "@/lib/actions/equipment";
import { MainCategoriesClient } from "@/components/features/equipment/main/main-categories-client";


export const metadata = {
  title: "Main Categories | Equipment",
  description: "Manage equipment main categories",
};

export default async function EquipmentMainCategoriesPage() {
  const categories = await getCachedMainCategories();
  const linkedCounts = await getSubCategoryCount(
    categories.map((c) => c.category_id),
  );

  return (
    <MainCategoriesClient categories={categories} linkedCounts={linkedCounts} />
  );
}
