"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { CategoryForm } from "./category-form";
import {
  deleteAttachmentCategory,
  getAttachmentCategoryLinkedCounts,
  formatAttachmentCategoryLinkedSummary,
} from "@/lib/actions/attachment";
import type { AttachmentCategory } from "@/types/attachment";

interface RowActionsProps {
  category: AttachmentCategory;
}

export function RowActions({ category }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteDescription, setDeleteDescription] = useState("");

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getAttachmentCategoryLinkedCounts([category.category_id]).then(
      async (counts) => {
        if (cancelled) return;
        const c = counts[category.category_id];
        if (c && c.total > 0) {
          const summary = await formatAttachmentCategoryLinkedSummary(c);
          setDeleteDescription(
            `This will permanently delete "${category.name}". There ${c.total === 1 ? "is" : "are"} ${summary} linked to this category.`,
          );
        } else {
          setDeleteDescription(
            `This will permanently delete "${category.name}". This action cannot be undone.`,
          );
        }
      },
    );
    return () => {
      cancelled = true;
      setDeleteDescription("");
    };
  }, [showDelete, category.category_id, category.name]);

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
        description={deleteDescription || "Loading…"}
        isPending={isPending}
      />
    </>
  );
}
