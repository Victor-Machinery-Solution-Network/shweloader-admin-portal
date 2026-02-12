"use client";

import { useState, useTransition } from "react";
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
import { EquipmentModelForm } from "./equipment-model-form";
import { deleteEquipmentModel } from "@/lib/actions/equipment-model";
import type { EquipmentModel, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

interface RowActionsProps {
  model: EquipmentModel;
  subCategories: EquipmentSubCategory[];
  brands: ProductBrand[];
}

export function RowActions({ model, subCategories, brands }: RowActionsProps) {
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

      {showEdit && (
        <EquipmentModelForm
          open={showEdit}
          onOpenChange={setShowEdit}
          model={model}
          subCategories={subCategories}
          brands={brands}
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
