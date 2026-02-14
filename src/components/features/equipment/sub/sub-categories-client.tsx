"use client";

import { useMemo, useState, useCallback } from "react";
import { FolderTree, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder } = useDragReorder(subCategories, {
    getRowId: (r) => r.sub_category_id,
    tableName: "equipment_sub_category",
  });
  const columns = useMemo(
    () => getColumns(categories, linkedInfo),
    [categories, linkedInfo],
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
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} sub categories (${names})`}.`;

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
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="sub category"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Sub Category
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search sub categories…"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.sub_category_id}
          onReorder={handleReorder}
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={FolderTree}
          title="No sub categories yet"
          description="Get started by creating your first equipment sub category."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Sub Category
            </Button>
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
