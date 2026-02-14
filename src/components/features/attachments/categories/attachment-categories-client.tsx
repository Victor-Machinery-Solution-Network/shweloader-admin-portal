"use client";

import { useState, useCallback, useEffect } from "react";
import { Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { CategoryForm } from "./category-form";
import { columns } from "./columns";
import {
  deleteAttachmentCategories,
  getAttachmentCategoryLinkedCounts,
  formatAttachmentCategoryLinkedSummary,
  reorderAttachmentCategories,
} from "@/lib/actions/attachment";
import type { AttachmentCategory } from "@/types/attachment";

interface AttachmentCategoriesClientProps {
  categories: AttachmentCategory[];
}

export function AttachmentCategoriesClient({
  categories,
}: AttachmentCategoriesClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [data, setData] = useState(categories);

  useEffect(() => {
    setData(categories);
  }, [categories]);

  const handleReorder = useCallback(
    async (reordered: AttachmentCategory[]) => {
      setData(reordered);
      const ids = reordered.map((c) => c.category_id);
      const result = await reorderAttachmentCategories(ids);
      if (!result.success) {
        toast.error(result.error);
        setData(categories);
      }
    },
    [categories],
  );

  const buildDescription = useCallback(
    async (selected: AttachmentCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      const counts = await getAttachmentCategoryLinkedCounts(ids);

      const names = selected.map((c) => `"${c.name}"`).join(", ");
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} categories (${names})`}.`;

      const totals = { attachmentModels: 0, brands: 0, total: 0 };
      for (const c of Object.values(counts)) {
        totals.attachmentModels += c.attachmentModels;
        totals.brands += c.brands;
        totals.total += c.total;
      }

      if (totals.total > 0) {
        const summary = await formatAttachmentCategoryLinkedSummary(totals);
        msg += ` There ${totals.total === 1 ? "is" : "are"} ${summary} linked to ${selected.length === 1 ? "this category" : "these categories"}.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: AttachmentCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      return deleteAttachmentCategories(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: AttachmentCategory[]) => (
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
      <PageHeader
        title="Attachment Categories"
        description="Manage attachment categories"
      />

      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search categories…"
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
          icon={Paperclip}
          title="No categories yet"
          description="Get started by creating your first attachment category."
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
