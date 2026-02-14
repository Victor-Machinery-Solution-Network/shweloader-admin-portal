"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { BrandForm } from "./brand-form";
import { deleteBrand } from "@/lib/actions/brand";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";

interface RowActionsProps {
  brand: ProductBrandWithCategories;
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
  linkedCount: number;
  linkedSummary: string;
}

export function RowActions({
  brand,
  categories,
  subCategories,
  linkedCount,
  linkedSummary,
}: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deleteDescription =
    linkedCount > 0
      ? <>This will permanently delete <strong>&ldquo;{brand.name}&rdquo;</strong>.<br />This brand is linked to <strong>{linkedSummary}</strong>. Deleting it will remove the brand reference from those models.</>
      : <>This will permanently delete <strong>&ldquo;{brand.name}&rdquo;</strong>.<br />This action cannot be undone.</>;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBrand(brand.brand_id);
      if (result.success) {
        toast.success("Brand deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  return (
    <>
      <RowActionsUI
        actions={[
          { label: "Edit", icon: Pencil, onClick: () => setShowEdit(true) },
          { label: "Delete", icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" },
        ]}
      />

      {showEdit && (
        <BrandForm
          open={showEdit}
          onOpenChange={setShowEdit}
          brand={brand}
          categories={categories}
          subCategories={subCategories}
          brandCategoryIds={brand.categoryIds}
          brandSubCategoryIds={brand.subCategoryIds}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete brand?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
