import {
  getCachedEquipmentModels,
  getCachedSubCategories,
  getCachedBrands,
} from "@/lib/cache";
import { EquipmentModelsClient } from "@/components/features/equipment/models/equipment-models-client";

export const metadata = {
  title: "Models | Equipment",
  description: "Manage equipment models",
};

export default async function EquipmentModelsPage() {
  const [models, subCategories, brands] = await Promise.all([
    getCachedEquipmentModels(),
    getCachedSubCategories(),
    getCachedBrands(),
  ]);

  return (
    <EquipmentModelsClient
      models={models}
      subCategories={subCategories}
      brands={brands}
    />
  );
}
