"use client";

import { useState, useCallback, useEffect } from "react";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { CategoryForm } from "./category-form";
import { columns } from "./columns";
import {
  deleteMainCategories,
  getSubCategoryCount,
  reorderMainCategories,
} from "@/lib/actions/equipment";
import type { EquipmentMainCategory } from "@/types/equipment";

interface MainCategoriesClientProps {
  categories: EquipmentMainCategory[];
}

export function MainCategoriesClient({
  categories,
}: MainCategoriesClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [data, setData] = useState(categories);

  // Sync local state when server data changes (after create/delete/revalidation)
  useEffect(() => {
    setData(categories);
  }, [categories]);

  const handleReorder = useCallback(
    async (reordered: EquipmentMainCategory[]) => {
      setData(reordered);
      const ids = reordered.map((c) => c.category_id);
      const result = await reorderMainCategories(ids);
      if (!result.success) {
        toast.error(result.error);
        setData(categories);
      }
    },
    [categories],
  );

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
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        buildDescription={buildDescription}
        itemLabel="category"
      />
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <PageHeader
        title="Main Categories"
        description="Manage equipment main categories"
      >
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Category
        </Button>
      </PageHeader>

      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search categories..."
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
