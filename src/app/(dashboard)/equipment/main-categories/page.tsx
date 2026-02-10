import { mainCategoryService } from '@/lib/services/equipment';
import { MainCategoriesClient } from '@/components/features/equipment/main/main-categories-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Main Categories | Equipment',
  description: 'Manage equipment main categories',
};

export default async function EquipmentMainCategoriesPage() {
  const categories = await mainCategoryService.list({
    sort_by: 'display_order',
    order: 'asc',
  });

  return <MainCategoriesClient categories={categories} />;
}
