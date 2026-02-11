"use client";

import { useState, useCallback, useMemo } from "react";
import { Cog, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { EquipmentModelForm } from "./equipment-model-form";
import { createColumns } from "./columns";
import { deleteEquipmentModels } from "@/lib/actions/equipment-model";
import type { EquipmentModel, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

interface EquipmentModelsClientProps {
  models: EquipmentModel[];
  subCategories: EquipmentSubCategory[];
  brands: ProductBrand[];
}

export function EquipmentModelsClient({
  models,
  subCategories,
  brands,
}: EquipmentModelsClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(subCategories, brands),
    [subCategories, brands],
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
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        itemLabel="model"
      />
    ),
    [handleBulkDelete],
  );

  return (
    <>
      <PageHeader
        title="Equipment Models"
        description="Manage equipment models"
      >
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Model
        </Button>
      </PageHeader>

      {models.length > 0 ? (
        <DataTable
          columns={columns}
          data={models}
          searchKey="name"
          searchPlaceholder="Search models..."
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
      />
    </>
  );
}
