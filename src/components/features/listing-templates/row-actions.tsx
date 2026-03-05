"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { deleteCustomFieldTemplate } from "@/lib/actions/custom-field-template";
import type { CustomFieldTemplateWithFields } from "@/types/custom-field";

interface TemplateRowActionsProps {
  template: CustomFieldTemplateWithFields;
}

export function TemplateRowActions({ template }: TemplateRowActionsProps) {
  const router = useRouter();
  const canEdit = useHasPermission("listing_templates", "edit");
  const canDelete = useHasPermission("listing_templates", "delete");
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
            onClick: () =>
              router.push(
                `/listing-templates/${template.template_id}/edit`,
              ),
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

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete template?"
        description={
          <>
            <strong>&ldquo;{template.name}&rdquo;</strong> will be moved to the
            trash.
            <br />
            Existing listings using these fields will not be affected.
          </>
        }
        isPending={isPending}
      />
    </>
  );
}
