import { unstable_cache } from 'next/cache';
import { mainCategoryService } from '@/lib/services/equipment';
import { MainCategoriesClient } from '@/components/features/equipment/main/main-categories-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Main Categories | Equipment',
  description: 'Manage equipment main categories',
};

const getCachedMainCategories = unstable_cache(
  () => mainCategoryService.list({ sort_by: 'display_order', order: 'asc' }),
  ['equipment-main-categories-list'],
  { revalidate: 300, tags: ['equipment-main-categories'] },
);

export default async function EquipmentMainCategoriesPage() {
  const categories = await getCachedMainCategories();

  return <MainCategoriesClient categories={categories} />;
}
