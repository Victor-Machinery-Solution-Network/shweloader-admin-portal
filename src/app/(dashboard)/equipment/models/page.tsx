import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import {
  getEquipmentModels,
  getMainCategories,
  getSubCategories,
  getBrands,
  getSubCategoryBrandLinks,
} from "@/lib/cache";
import { EquipmentModelsClient } from "@/components/features/equipment/models/equipment-models-client";

export const metadata = {
  title: "Models | Equipment",
  description: "Manage equipment models",
};

export default function EquipmentModelsPage() {
  return (
    <>
      <PageHeader
        title="Equipment Models"
        description="Manage equipment models"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <EquipmentModelsContent />
      </Suspense>
    </>
  );
}

async function EquipmentModelsContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(
    CACHE_TAGS.EQUIPMENT_MODELS,
    CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES,
    CACHE_TAGS.BRANDS,
  );

  const [models, mainCategories, subCategories, brands, subCategoryBrandLinks] =
    await Promise.all([
      getEquipmentModels(),
      getMainCategories(),
      getSubCategories(),
      getBrands(),
      getSubCategoryBrandLinks(),
    ]);

  return (
    <EquipmentModelsClient
      models={models}
      mainCategories={mainCategories}
      subCategories={subCategories}
      brands={brands}
      subCategoryBrandLinks={subCategoryBrandLinks}
    />
  );
}
