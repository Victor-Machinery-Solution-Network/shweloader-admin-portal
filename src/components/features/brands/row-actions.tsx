"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { BrandForm } from "./brand-form";
import {
  deleteBrand,
  getBrandLinkedCounts,
  formatBrandLinkedSummary,
} from "@/lib/actions/brand";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";

interface RowActionsProps {
  brand: ProductBrandWithCategories;
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
}

export function RowActions({
  brand,
  categories,
  subCategories,
}: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteDescription, setDeleteDescription] = useState("");

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getBrandLinkedCounts([brand.brand_id]).then(async (counts) => {
      if (cancelled) return;
      const c = counts[brand.brand_id];
      if (c && c.total > 0) {
        const summary = await formatBrandLinkedSummary(c);
        setDeleteDescription(
          `This brand is linked to ${summary}. Deleting it will remove the brand reference from those models. This action cannot be undone.`,
        );
      } else {
        setDeleteDescription(
          `This will permanently delete "${brand.name}". This action cannot be undone.`,
        );
      }
    });
    return () => {
      cancelled = true;
      setDeleteDescription("");
    };
  }, [showDelete, brand.brand_id, brand.name]);

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
        description={deleteDescription || "Loading…"}
        isPending={isPending}
      />
    </>
  );
}
