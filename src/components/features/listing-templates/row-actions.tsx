"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { TemplateForm } from "./template-form";
import { deleteCustomFieldTemplate } from "@/lib/actions/custom-field-template";
import type { CustomFieldTemplateWithFields } from "@/types/custom-field";

interface TemplateRowActionsProps {
  template: CustomFieldTemplateWithFields;
}

export function TemplateRowActions({ template }: TemplateRowActionsProps) {
  const canEdit = useHasPermission("listing_templates", "edit");
  const canDelete = useHasPermission("listing_templates", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCustomFieldTemplate(template.template_id);
      if (result.success) {
        toast.success("Template deleted");
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
            onClick: () => setShowEdit(true),
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
      <RowActions actions={actions} />

      {showEdit && (
        <TemplateForm
          open={showEdit}
          onOpenChange={setShowEdit}
          template={template}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete template?"
        description={
          <>
            This will permanently delete{" "}
            <strong>&ldquo;{template.name}&rdquo;</strong>.
            <br />
            Existing listings using these fields will not be affected.
          </>
        }
        isPending={isPending}
      />
    </>
  );
}
