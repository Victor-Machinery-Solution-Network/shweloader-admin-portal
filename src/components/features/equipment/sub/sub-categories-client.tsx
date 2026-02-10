"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { FolderTree, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { SubCategoryForm } from "./sub-category-form";
import { getColumns } from "./columns";
import {
  deleteSubCategories,
  reorderSubCategories,
  getSubCategoryLinkedCounts,
  formatSubCategoryLinkedSummary,
} from "@/lib/actions/equipment";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";

interface SubCategoriesClientProps {
  subCategories: EquipmentSubCategory[];
  categories: EquipmentMainCategory[];
}

export function SubCategoriesClient({
  subCategories,
  categories,
}: SubCategoriesClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [data, setData] = useState(subCategories);
  const columns = useMemo(() => getColumns(categories), [categories]);

  // Sync local state when server data changes (after create/delete/revalidation)
  useEffect(() => {
    setData(subCategories);
  }, [subCategories]);

  const handleReorder = useCallback(
    async (reordered: EquipmentSubCategory[]) => {
      setData(reordered);
      const ids = reordered.map((s) => s.sub_category_id);
      const result = await reorderSubCategories(ids);
      if (!result.success) {
        toast.error(result.error);
        setData(subCategories);
      }
    },
    [subCategories],
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
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        buildDescription={buildDescription}
        itemLabel="sub category"
      />
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <PageHeader
        title="Sub Categories"
        description="Manage equipment sub categories"
      >
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Sub Category
        </Button>
      </PageHeader>

      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search sub categories..."
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
