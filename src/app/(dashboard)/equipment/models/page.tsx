import {
  getCachedEquipmentModels,
  getCachedMainCategories,
  getCachedSubCategories,
  getCachedBrands,
} from "@/lib/cache";
import { EquipmentModelsClient } from "@/components/features/equipment/models/equipment-models-client";

export const metadata = {
  title: "Models | Equipment",
  description: "Manage equipment models",
};

export default async function EquipmentModelsPage() {
  const [models, mainCategories, subCategories, brands] = await Promise.all([
    getCachedEquipmentModels(),
    getCachedMainCategories(),
    getCachedSubCategories(),
    getCachedBrands(),
  ]);

  return (
    <EquipmentModelsClient
      models={models}
      mainCategories={mainCategories}
      subCategories={subCategories}
      brands={brands}
    />
  );
}
