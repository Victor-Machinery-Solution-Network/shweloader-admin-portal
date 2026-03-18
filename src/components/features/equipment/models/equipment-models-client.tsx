"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Cog, Plus, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterConfig } from "@/types/data-table-filters";
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
  const canCreate = useHasPermission("equipment_models", "create");
  const canDelete = useHasPermission("equipment_models", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(mainCategories, subCategories, brands, subCategoryBrandLinks),
    [mainCategories, subCategories, brands, subCategoryBrandLinks],
  );

  // Build cascade map: main_category_name → sub_category_names[]
  const cascadeMap = useMemo(() => {
    const mainMap = new Map(mainCategories.map((c) => [c.category_id, c.name]));
    const result: Record<string, string[]> = {};
    for (const sub of subCategories) {
      const mainName = mainMap.get(sub.category_id);
      if (mainName) {
        if (!result[mainName]) result[mainName] = [];
        result[mainName].push(sub.name);
      }
    }
    return result;
  }, [mainCategories, subCategories]);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "brand",
        label: "Brand",
        type: "multi-select",
        options: brands.map((b) => ({ label: b.name, value: b.name })),
      },
      {
        columnId: "main_category",
        label: "Main Category",
        type: "multi-select",
        options: mainCategories.map((c) => ({ label: c.name, value: c.name })),
      },
      {
        columnId: "sub_category",
        label: "Sub Category",
        type: "multi-select",
        options: subCategories.map((c) => ({ label: c.name, value: c.name })),
        cascadeFrom: "main_category",
        cascadeMap,
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [brands, mainCategories, subCategories, cascadeMap],
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
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            itemLabel="model"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add Model <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/equipment-models">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDelete, canCreate, canDelete],
  );

  return (
    <>
      {models.length > 0 ? (
        <DataTable
          columns={columns}
          data={models}
          searchKeys={["name"]}
          searchPlaceholder="Search models"
          filterConfig={filterConfig}
          filterStorageKey="equipment-models-filters"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.model_id}
          toolbar={renderToolbar}
          enableExport
          exportFileName="equipment-models"
        />
      ) : (
        <EmptyState
          icon={Cog}
          title="No equipment models yet"
          description="Get started by creating your first equipment model."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Add Model <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/equipment-models">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <EquipmentModelForm
        open={showCreate}
        onOpenChange={setShowCreate}
        mainCategories={mainCategories}
        subCategories={subCategories}
        brands={brands}
        subCategoryBrandLinks={subCategoryBrandLinks}
      />
    </>
  );
}
