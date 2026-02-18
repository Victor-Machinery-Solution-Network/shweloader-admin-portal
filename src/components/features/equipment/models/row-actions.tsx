"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { EquipmentModelForm } from "./equipment-model-form";
import { deleteEquipmentModel } from "@/lib/actions/equipment-model";
import type { EquipmentModel, EquipmentMainCategory, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

interface RowActionsProps {
  model: EquipmentModel;
  mainCategories: EquipmentMainCategory[];
  subCategories: EquipmentSubCategory[];
  brands: ProductBrand[];
  subCategoryBrandLinks: { sub_category_id: number; brand_id: number }[];
}

export function RowActions({ model, mainCategories, subCategories, brands, subCategoryBrandLinks }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEquipmentModel(model.model_id);
      if (result.success) {
        toast.success("Equipment model deleted");
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
        <EquipmentModelForm
          open={showEdit}
          onOpenChange={setShowEdit}
          model={model}
          mainCategories={mainCategories}
          subCategories={subCategories}
          brands={brands}
          subCategoryBrandLinks={subCategoryBrandLinks}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete equipment model?"
        description={`This will permanently delete "${model.name}". This action cannot be undone.`}
        isPending={isPending}
      />
    </>
  );
}
