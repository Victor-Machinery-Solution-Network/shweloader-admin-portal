import { getCachedMainCategories } from "@/lib/cache";
import { MainCategoriesClient } from "@/components/features/equipment/main/main-categories-client";


export const metadata = {
  title: "Main Categories | Equipment",
  description: "Manage equipment main categories",
};

export default async function EquipmentMainCategoriesPage() {
  const categories = await getCachedMainCategories();

  return <MainCategoriesClient categories={categories} />;
}
