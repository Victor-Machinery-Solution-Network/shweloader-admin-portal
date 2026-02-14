"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
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
    if (!showDelete) return;
    let cancelled = false;
    getSubCategoryLinkedCounts([subCategory.sub_category_id]).then(
      async (counts) => {
        if (cancelled) return;
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
    return () => {
      cancelled = true;
      setDeleteDescription("");
    };
  }, [showDelete, subCategory.sub_category_id, subCategory.name]);

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
      <RowActionsUI
        actions={[
          { label: "Edit", icon: Pencil, onClick: () => setShowEdit(true) },
          { label: "Delete", icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" },
        ]}
      />

      {showEdit && (
        <SubCategoryForm
          open={showEdit}
          onOpenChange={setShowEdit}
          subCategory={subCategory}
          categories={categories}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete sub category?"
        description={deleteDescription || "Loading…"}
        isPending={isPending}
      />
    </>
  );
}
