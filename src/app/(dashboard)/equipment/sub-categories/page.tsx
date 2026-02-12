import { unstable_cache } from 'next/cache';
import { mainCategoryService, subCategoryService } from '@/lib/services/equipment';
import { SubCategoriesClient } from '@/components/features/equipment/sub/sub-categories-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sub Categories | Equipment',
  description: 'Manage equipment sub categories',
};

const getCachedSubCategories = unstable_cache(
  () => subCategoryService.list({ sort_by: 'display_order', order: 'asc' }),
  ['equipment-sub-categories-list'],
  { revalidate: 300, tags: ['equipment-sub-categories'] },
);

const getCachedMainCategories = unstable_cache(
  () => mainCategoryService.list({ sort_by: 'name', order: 'asc' }),
  ['equipment-main-categories-list'],
  { revalidate: 300, tags: ['equipment-main-categories'] },
);

export default async function EquipmentSubCategoriesPage() {
  const [subCategories, categories] = await Promise.all([
    getCachedSubCategories(),
    getCachedMainCategories(),
  ]);

  return <SubCategoriesClient subCategories={subCategories} categories={categories} />;
}
