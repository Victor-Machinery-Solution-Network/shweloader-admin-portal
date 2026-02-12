"use client";

import { useState, useEffect, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { CategoryForm } from "./category-form";
import {
  deleteArticleCategory,
  getArticleCount,
} from "@/lib/actions/article-category";
import type { ArticleCategory } from "@/types/article";

interface RowActionsProps {
  category: ArticleCategory;
}

export function RowActions({ category }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getArticleCount([category.category_id]).then((counts) => {
      if (!cancelled) setLinkedCount(counts[category.category_id] ?? 0);
    });
    return () => {
      cancelled = true;
      setLinkedCount(null);
    };
  }, [showDelete, category.category_id]);

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
    linkedCount !== null && linkedCount > 0
      ? `This will permanently delete "${category.name}". There ${linkedCount === 1 ? "is" : "are"} ${linkedCount} ${linkedCount === 1 ? "article" : "articles"} linked to this category. Those articles will have their category unset.`
      : `This will permanently delete "${category.name}". This action cannot be undone.`;

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
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
