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
import { SubCategoryForm } from "./sub-category-form";
import {
  deleteSubCategory,
  getSubCategoryLinkedCounts,
  formatSubCategoryLinkedSummary,
} from "@/lib/actions/equipment";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";

interface RowActionsProps {
  subCategory: EquipmentSubCategory;
  categories: EquipmentMainCategory[];
}

export function RowActions({ subCategory, categories }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteDescription, setDeleteDescription] = useState("");

  useEffect(() => {
    getSubCategoryLinkedCounts([subCategory.sub_category_id]).then(
      async (counts) => {
        const c = counts[subCategory.sub_category_id];
        if (c && c.total > 0) {
          const summary = await formatSubCategoryLinkedSummary(c);
          setDeleteDescription(
            `This will permanently delete "${subCategory.name}". There ${c.total === 1 ? "is" : "are"} ${summary} linked to this sub category.`,
          );
        } else {
          setDeleteDescription(
            `This will permanently delete "${subCategory.name}". This action cannot be undone.`,
          );
        }
      },
    );
  }, [subCategory.sub_category_id, subCategory.name]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSubCategory(subCategory.sub_category_id);
      if (result.success) {
        toast.success("Sub category deleted");
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

      <SubCategoryForm
        open={showEdit}
        onOpenChange={setShowEdit}
        subCategory={subCategory}
        categories={categories}
      />

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete sub category?"
        description={deleteDescription || "Loading..."}
        isPending={isPending}
      />
    </>
  );
}
