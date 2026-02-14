"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

  return (
    <>
      <RowActionsUI
        actions={[
          { label: "Edit", icon: Pencil, onClick: () => setShowEdit(true) },
          { label: "Delete", icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" },
        ]}
      />

      <CategoryForm
        open={showEdit}
        onOpenChange={setShowEdit}
        category={category}
      />

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
