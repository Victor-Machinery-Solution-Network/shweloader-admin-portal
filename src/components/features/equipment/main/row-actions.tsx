"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { CategoryForm } from "./category-form";
import { deleteMainCategory } from "@/lib/actions/equipment";
import type { EquipmentMainCategory } from "@/types/equipment";

interface RowActionsProps {
  category: EquipmentMainCategory;
  linkedCount: number;
}

export function RowActions({ category, linkedCount }: RowActionsProps) {
  const canEdit = useHasPermission("equipment_main_categories", "edit");
  const canDelete = useHasPermission("equipment_main_categories", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMainCategory(category.category_id);
      if (result.success) {
        toast.success("Category deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount > 0
      ? <>This will permanently delete <strong>&ldquo;{category.name}&rdquo;</strong>.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> sub {linkedCount === 1 ? "category" : "categories"} linked to this category that must be removed first.</>
      : <>This will permanently delete <strong>&ldquo;{category.name}&rdquo;</strong>.<br />This action cannot be undone.</>;

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      {showEdit && (
        <CategoryForm
          open={showEdit}
          onOpenChange={setShowEdit}
          category={category}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete category?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
