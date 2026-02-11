import {
  equipmentModelService,
  subCategoryService,
} from "@/lib/services/equipment";
import { brandService } from "@/lib/services/brand";
import { EquipmentModelsClient } from "@/components/features/equipment/models/equipment-models-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Models | Equipment",
  description: "Manage equipment models",
};

export default async function EquipmentModelsPage() {
  const [models, subCategories, brands] = await Promise.all([
    equipmentModelService.list({ sort_by: "name", order: "asc" }),
    subCategoryService.list({ sort_by: "name", order: "asc" }),
    brandService.list({ sort_by: "name", order: "asc" }),
  ]);

  return (
    <EquipmentModelsClient
      models={models}
      subCategories={subCategories}
      brands={brands}
    />
  );
}
