"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deleteDescription =
    linkedCount > 0
      ? `This will permanently delete "${category.name}". There ${linkedCount === 1 ? "is" : "are"} ${linkedSummary} linked to this category.`
      : `This will permanently delete "${category.name}". This action cannot be undone.`;

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

  return (
    <>
      <RowActionsUI
        actions={[
          { label: "Edit", icon: Pencil, onClick: () => setShowEdit(true) },
          { label: "Delete", icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" },
        ]}
      />

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
