"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronDown, FileSpreadsheet, FileText, Paperclip, Plus } from "lucide-react";
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
import { CategoryForm } from "./category-form";
import { getColumns } from "./columns";
import {
  deleteAttachmentCategories,
  getAttachmentCategoryLinkedCounts,
  formatAttachmentCategoryLinkedSummary,
} from "@/lib/actions/attachment";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type { AttachmentCategory } from "@/types/attachment";

interface AttachmentCategoriesClientProps {
  categories: AttachmentCategory[];
  linkedInfo: Record<number, { total: number; summary: string }>;
}

export function AttachmentCategoriesClient({
  categories,
  linkedInfo,
}: AttachmentCategoriesClientProps) {
  const canCreate = useHasPermission("attachment_categories", "create");
  const canDelete = useHasPermission("attachment_categories", "delete");
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder, handleMoveToPosition } = useDragReorder(
    categories,
    {
      getRowId: (r) => r.category_id,
      tableName: "attachment_category",
      feature: "attachment_categories",
    },
  );
  const columns = useMemo(() => getColumns(linkedInfo), [linkedInfo]);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [{ columnId: "created_at", label: "Created At", type: "date-range" }],
    [],
  );

  const buildDescription = useCallback(
    async (selected: AttachmentCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      const counts = await getAttachmentCategoryLinkedCounts(ids);

      const names = selected.map((c) => `"${c.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} categories (${names})`} will be moved to the trash.`;

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
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="category"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add Category <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/attachment-categories">
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
          searchPlaceholder="Search categories"
          filterConfig={filterConfig}
          filterStorageKey="attachment-categories-filters"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.category_id}
          onReorder={handleReorder}
          onMoveToPosition={handleMoveToPosition}
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Paperclip}
          title="No categories yet"
          description="Get started by creating your first attachment category."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Add Category <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/attachment-categories">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <CategoryForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
