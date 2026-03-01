"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { AttachmentModelForm } from "./attachment-model-form";
import { deleteAttachmentModel } from "@/lib/actions/attachment-model";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

interface RowActionsProps {
  model: AttachmentModel;
  categories: AttachmentCategory[];
  brands: ProductBrand[];
  categoryBrandLinks: { category_id: number; brand_id: number }[];
}

export function RowActions({ model, categories, brands, categoryBrandLinks }: RowActionsProps) {
  const canEdit = useHasPermission("attachment_models", "edit");
  const canDelete = useHasPermission("attachment_models", "delete");
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

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      {showEdit && (
        <AttachmentModelForm
          open={showEdit}
          onOpenChange={setShowEdit}
          model={model}
          categories={categories}
          brands={brands}
          categoryBrandLinks={categoryBrandLinks}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete attachment model?"
        description={`"${model.name}" will be moved to the trash. You can restore it within 30 days.`}
        isPending={isPending}
      />
    </>
  );
}
