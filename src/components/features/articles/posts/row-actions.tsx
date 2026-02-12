"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ArticleForm } from "./article-form";
import { deleteArticle } from "@/lib/actions/article";
import type { ArticleWithDetails, ArticleCategory } from "@/types/article";

interface RowActionsProps {
  article: ArticleWithDetails;
  categories: ArticleCategory[];
}

export function RowActions({ article, categories }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowEdit(true)}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ArticleForm
        open={showEdit}
        onOpenChange={setShowEdit}
        article={article}
        categories={categories}
      />

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
