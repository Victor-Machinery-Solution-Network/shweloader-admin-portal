"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { deleteArticle } from "@/lib/actions/article";
import type { ArticleWithDetails } from "@/types/article";

interface RowActionsProps {
  article: ArticleWithDetails;
}

export function RowActions({ article }: RowActionsProps) {
  const router = useRouter();
  const canEdit = useHasPermission("articles", "edit");
  const canDelete = useHasPermission("articles", "delete");
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteArticle(article.article_id);
      if (result.success) {
        toast.success("Article deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const actions = [
    ...(canEdit
      ? [
          {
            label: "Edit" as const,
            icon: Pencil,
            onClick: () =>
              router.push(`/articles/posts/${article.article_id}/edit`),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: "Delete" as const,
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive" as const,
            separatorBefore: true,
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete article?"
        description={`This will permanently delete "${article.title}". This action cannot be undone.`}
        isPending={isPending}
      />
    </>
  );
}
