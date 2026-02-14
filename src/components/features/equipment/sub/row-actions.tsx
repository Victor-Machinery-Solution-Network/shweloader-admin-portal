"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { SubCategoryForm } from "./sub-category-form";
import { deleteSubCategory } from "@/lib/actions/equipment";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";

interface RowActionsProps {
  subCategory: EquipmentSubCategory;
  categories: EquipmentMainCategory[];
  linkedCount: number;
  linkedSummary: string;
}

export function RowActions({ subCategory, categories, linkedCount, linkedSummary }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deleteDescription =
    linkedCount > 0
      ? `This will permanently delete "${subCategory.name}". There ${linkedCount === 1 ? "is" : "are"} ${linkedSummary} linked to this sub category.`
      : `This will permanently delete "${subCategory.name}". This action cannot be undone.`;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSubCategory(subCategory.sub_category_id);
      if (result.success) {
        toast.success("Sub category deleted");
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
        <SubCategoryForm
          open={showEdit}
          onOpenChange={setShowEdit}
          subCategory={subCategory}
          categories={categories}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete sub category?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
