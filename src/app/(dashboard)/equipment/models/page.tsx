import { unstable_cache } from "next/cache";
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

const getCachedEquipmentModels = unstable_cache(
  () => equipmentModelService.list({ sort_by: "name", order: "asc" }),
  ["equipment-models-list"],
  { revalidate: 120, tags: ["equipment-models"] },
);

const getCachedSubCategories = unstable_cache(
  () => subCategoryService.list({ sort_by: "name", order: "asc" }),
  ["equipment-sub-categories-list"],
  { revalidate: 300, tags: ["equipment-sub-categories"] },
);

const getCachedBrands = unstable_cache(
  () => brandService.list({ sort_by: "name", order: "asc" }),
  ["brands-list"],
  { revalidate: 300, tags: ["brands"] },
);

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
