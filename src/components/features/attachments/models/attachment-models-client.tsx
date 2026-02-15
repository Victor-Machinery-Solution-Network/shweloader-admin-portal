"use client";

import { useState, useCallback, useMemo } from "react";
import { Cog, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(categories, brands, categoryBrandLinks),
    [categories, brands, categoryBrandLinks],
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
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          itemLabel="model"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Model
        </Button>
      </>
    ),
    [handleBulkDelete],
  );

  return (
    <>
      {models.length > 0 ? (
        <DataTable
          columns={columns}
          data={models}
          searchKey="name"
          searchPlaceholder="Search models"
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
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Model
            </Button>
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
