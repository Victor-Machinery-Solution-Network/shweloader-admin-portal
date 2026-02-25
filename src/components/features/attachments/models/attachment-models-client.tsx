"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronDown, Cog, FileSpreadsheet, FileText, Plus } from "lucide-react";
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
import { AttachmentModelForm } from "./attachment-model-form";
import { createColumns } from "./columns";
import { deleteAttachmentModels } from "@/lib/actions/attachment-model";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

interface CategoryBrandLink {
  category_id: number;
  brand_id: number;
}

interface AttachmentModelsClientProps {
  models: AttachmentModel[];
  categories: AttachmentCategory[];
  brands: ProductBrand[];
  categoryBrandLinks: CategoryBrandLink[];
}

export function AttachmentModelsClient({
  models,
  categories,
  brands,
  categoryBrandLinks,
}: AttachmentModelsClientProps) {
  const canCreate = useHasPermission("attachment_models", "create");
  const canDelete = useHasPermission("attachment_models", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(categories, brands, categoryBrandLinks),
    [categories, brands, categoryBrandLinks],
  );

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "brand",
        label: "Brand",
        type: "multi-select",
        options: brands.map((b) => ({ label: b.name, value: b.name })),
      },
      {
        columnId: "category",
        label: "Category",
        type: "multi-select",
        options: categories.map((c) => ({ label: c.name, value: c.name })),
      },
      { columnId: "created_at", label: "Created", type: "date-range" },
    ],
    [brands, categories],
  );

  const handleBulkDelete = useCallback(
    async (selected: AttachmentModel[]) => {
      const ids = selected.map((m) => m.model_id);
      return deleteAttachmentModels(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: AttachmentModel[]) => (
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
                <Link href="/bulk-upload/attachment-models">
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
          filterStorageKey="attachment-models-filters"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.model_id}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Cog}
          title="No attachment models yet"
          description="Get started by creating your first attachment model."
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
                    <Link href="/bulk-upload/attachment-models">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <AttachmentModelForm
        open={showCreate}
        onOpenChange={setShowCreate}
        categories={categories}
        brands={brands}
        categoryBrandLinks={categoryBrandLinks}
      />
    </>
  );
}
