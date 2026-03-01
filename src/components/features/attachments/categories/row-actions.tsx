"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { CategoryForm } from "./category-form";
import { deleteAttachmentCategory } from "@/lib/actions/attachment";
import type { AttachmentCategory } from "@/types/attachment";

interface RowActionsProps {
  category: AttachmentCategory;
  linkedCount: number;
  linkedSummary: string;
}

export function RowActions({ category, linkedCount, linkedSummary }: RowActionsProps) {
  const canEdit = useHasPermission("attachment_categories", "edit");
  const canDelete = useHasPermission("attachment_categories", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deleteDescription =
    linkedCount > 0
      ? <><strong>&ldquo;{category.name}&rdquo;</strong> will be moved to the trash.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedSummary}</strong> linked to this category.</>
      : <><strong>&ldquo;{category.name}&rdquo;</strong> will be moved to the trash.<br />You can restore it within 30 days.</>;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAttachmentCategory(category.category_id);
      if (result.success) {
        toast.success("Category deleted");
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
