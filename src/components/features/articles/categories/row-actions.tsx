"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { CategoryForm } from "./category-form";
import { deleteArticleCategory } from "@/lib/actions/article-category";
import type { ArticleCategory } from "@/types/article";

interface RowActionsProps {
  category: ArticleCategory;
  linkedCount: number;
}

export function RowActions({ category, linkedCount }: RowActionsProps) {
  const canEdit = useHasPermission("article_categories", "edit");
  const canDelete = useHasPermission("article_categories", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteArticleCategory(category.category_id);
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
      ? <>This will permanently delete <strong>&ldquo;{category.name}&rdquo;</strong>.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> {linkedCount === 1 ? "article" : "articles"} linked to this category. Those articles will have their category unset.</>
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
