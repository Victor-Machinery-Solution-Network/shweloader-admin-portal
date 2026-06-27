"use client";

import { useMemo, useState, useCallback } from "react";
import { ChevronDown, FileSpreadsheet, FileText, FolderTree, Plus } from "lucide-react";
import Link from "next/link";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { SubCategoryForm } from "./sub-category-form";
import { getColumns } from "./columns";
import {
  deleteSubCategories,
  getSubCategoryLinkedCounts,
  formatSubCategoryLinkedSummary,
} from "@/lib/actions/equipment";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";

interface SubCategoriesClientProps {
  subCategories: EquipmentSubCategory[];
  categories: EquipmentMainCategory[];
  linkedInfo: Record<number, { total: number; summary: string }>;
}

export function SubCategoriesClient({
  subCategories,
  categories,
  linkedInfo,
}: SubCategoriesClientProps) {
  const canCreate = useHasPermission("equipment_sub_categories", "create");
  const canExport = useHasPermission("equipment_sub_categories", "export");
  const canDelete = useHasPermission("equipment_sub_categories", "delete");
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder, handleMoveToPosition } = useDragReorder(
    subCategories,
    {
      getRowId: (r) => r.sub_category_id,
      tableName: "equipment_sub_category",
      feature: "equipment_sub_categories",
    },
  );
  const columns = useMemo(
    () => getColumns(categories, linkedInfo),
    [categories, linkedInfo],
  );

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "category_id",
        label: "Main Category",
        type: "multi-select",
        options: categories.map((c) => ({
          label: c.name,
          value: String(c.category_id),
        })),
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [categories],
  );

  const handleBulkDelete = useCallback(
    async (selected: EquipmentSubCategory[]) => {
      const ids = selected.map((s) => s.sub_category_id);
      return deleteSubCategories(ids);
    },
    [],
  );

  const buildDescription = useCallback(
    async (selected: EquipmentSubCategory[]) => {
      const ids = selected.map((s) => s.sub_category_id);
      const counts = await getSubCategoryLinkedCounts(ids);

      const names = selected.map((s) => `"${s.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} sub categories (${names})`} will be moved to the trash.`;

      const totals = { equipmentModels: 0, brands: 0, total: 0 };
      for (const c of Object.values(counts)) {
        totals.equipmentModels += c.equipmentModels;
        totals.brands += c.brands;
        totals.total += c.total;
      }

      if (totals.total > 0) {
        const summary = await formatSubCategoryLinkedSummary(totals);
        msg += ` There ${totals.total === 1 ? "is" : "are"} ${summary} linked to ${selected.length === 1 ? "this sub category" : "these sub categories"}.`;
      }

      return msg;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: EquipmentSubCategory[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="sub category"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add Sub Category <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/equipment-sub-categories">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKeys={["name"]}
          searchPlaceholder="Search sub categories"
          filterConfig={filterConfig}
          filterStorageKey="equipment-sub-filters"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.sub_category_id}
          onReorder={handleReorder}
          onMoveToPosition={handleMoveToPosition}
          pageSize={10}
          toolbar={renderToolbar}
          enableExport={canExport}
          exportFileName="equipment-sub-categories"
        />
      ) : (
        <EmptyState
          icon={FolderTree}
          title="No sub categories yet"
          description="Get started by creating your first equipment sub category."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Add Sub Category <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/equipment-sub-categories">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <SubCategoryForm
        open={showCreate}
        onOpenChange={setShowCreate}
        categories={categories}
      />
    </>
  );
}
