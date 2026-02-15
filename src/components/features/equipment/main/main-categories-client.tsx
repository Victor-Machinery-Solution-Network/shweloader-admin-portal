"use client";

import { useState, useCallback, useMemo } from "react";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { CategoryForm } from "./category-form";
import { getColumns } from "./columns";
import {
  deleteMainCategories,
  getSubCategoryCount,
} from "@/lib/actions/equipment";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type { EquipmentMainCategory } from "@/types/equipment";

interface MainCategoriesClientProps {
  categories: EquipmentMainCategory[];
  linkedCounts: Record<number, number>;
}

export function MainCategoriesClient({
  categories,
  linkedCounts,
}: MainCategoriesClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder } = useDragReorder(categories, {
    getRowId: (r) => r.category_id,
    tableName: "equipment_main_category",
  });
  const columns = useMemo(() => getColumns(linkedCounts), [linkedCounts]);

  const buildDescription = useCallback(
    async (selected: EquipmentMainCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      const counts = await getSubCategoryCount(ids);
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((c) => `"${c.name}"`).join(", ");
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} categories (${names})`}.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} sub ${totalLinked === 1 ? "category" : "categories"} linked to ${selected.length === 1 ? "this category" : "these categories"} that must be removed first.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: EquipmentMainCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      return deleteMainCategories(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: EquipmentMainCategory[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="category"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Category
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
          searchPlaceholder="Search categories"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.category_id}
          onReorder={handleReorder}
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Layers}
          title="No categories yet"
          description="Get started by creating your first equipment main category."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Category
            </Button>
          }
        />
      )}

      <CategoryForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
