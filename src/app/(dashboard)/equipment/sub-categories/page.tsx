import { mainCategoryService, subCategoryService } from '@/lib/services/equipment';
import { SubCategoriesClient } from '@/components/features/equipment/sub/sub-categories-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sub Categories | Equipment',
  description: 'Manage equipment sub categories',
};

export default async function EquipmentSubCategoriesPage() {
  const [subCategories, categories] = await Promise.all([
    subCategoryService.list({ sort_by: 'display_order', order: 'asc' }),
    mainCategoryService.list({ sort_by: 'name', order: 'asc' }),
  ]);

  return <SubCategoriesClient subCategories={subCategories} categories={categories} />;
}
