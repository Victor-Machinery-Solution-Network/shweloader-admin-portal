import { getCachedSubCategories, getCachedMainCategories } from "@/lib/cache";
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

  return (
    <SubCategoriesClient subCategories={subCategories} categories={categories} />
  );
}
