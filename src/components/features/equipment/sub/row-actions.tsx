"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
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
  const canEdit = useHasPermission("equipment_sub_categories", "edit");
  const canDelete = useHasPermission("equipment_sub_categories", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deleteDescription =
    linkedCount > 0
      ? <><strong>&ldquo;{subCategory.name}&rdquo;</strong> will be moved to the trash.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedSummary}</strong> linked to this sub category.</>
      : <><strong>&ldquo;{subCategory.name}&rdquo;</strong> will be moved to the trash.<br />You can restore it within 30 days.</>;

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

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

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
