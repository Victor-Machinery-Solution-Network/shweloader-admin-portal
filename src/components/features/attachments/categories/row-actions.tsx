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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowEdit(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
        description={deleteDescription || "Loading..."}
        isPending={isPending}
      />
    </>
  );
}
