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
import { AttachmentModelForm } from "./attachment-model-form";
import { deleteAttachmentModel } from "@/lib/actions/attachment-model";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

interface RowActionsProps {
  model: AttachmentModel;
  categories: AttachmentCategory[];
  brands: ProductBrand[];
}

export function RowActions({ model, categories, brands }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAttachmentModel(model.model_id);
      if (result.success) {
        toast.success("Attachment model deleted");
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
        <AttachmentModelForm
          open={showEdit}
          onOpenChange={setShowEdit}
          model={model}
          categories={categories}
          brands={brands}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete attachment model?"
        description={`This will permanently delete "${model.name}". This action cannot be undone.`}
        isPending={isPending}
      />
    </>
  );
}
