"use client";

import { useState, useCallback, useMemo } from "react";
import { Cog, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { EquipmentModelForm } from "./equipment-model-form";
import { createColumns } from "./columns";
import { deleteEquipmentModels } from "@/lib/actions/equipment-model";
import type { EquipmentModel, EquipmentMainCategory, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

interface SubCategoryBrandLink {
  sub_category_id: number;
  brand_id: number;
}

interface EquipmentModelsClientProps {
  models: EquipmentModel[];
  mainCategories: EquipmentMainCategory[];
  subCategories: EquipmentSubCategory[];
  brands: ProductBrand[];
  subCategoryBrandLinks: SubCategoryBrandLink[];
}

export function EquipmentModelsClient({
  models,
  mainCategories,
  subCategories,
  brands,
  subCategoryBrandLinks,
}: EquipmentModelsClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(mainCategories, subCategories, brands, subCategoryBrandLinks),
    [mainCategories, subCategories, brands, subCategoryBrandLinks],
  );

  const handleBulkDelete = useCallback(
    async (selected: EquipmentModel[]) => {
      const ids = selected.map((m) => m.model_id);
      return deleteEquipmentModels(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: EquipmentModel[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          itemLabel="model"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Model
        </Button>
      </>
    ),
    [handleBulkDelete],
  );

  return (
    <>
      {models.length > 0 ? (
        <DataTable
          columns={columns}
          data={models}
          searchKey="name"
          searchPlaceholder="Search models…"
          enableSelection
          enablePagination
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Cog}
          title="No equipment models yet"
          description="Get started by creating your first equipment model."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Model
            </Button>
          }
        />
      )}

      <EquipmentModelForm
        open={showCreate}
        onOpenChange={setShowCreate}
        subCategories={subCategories}
        brands={brands}
        subCategoryBrandLinks={subCategoryBrandLinks}
      />
    </>
  );
}
