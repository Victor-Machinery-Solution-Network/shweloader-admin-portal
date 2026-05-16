"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ROUTES } from "@/lib/constants";
import { deletePopupPromotion } from "@/lib/actions/popup-promotion";
import type { PopupPromotion } from "@/types/popup-promotion";

interface RowActionsProps {
  promotion: PopupPromotion;
}

export function RowActions({ promotion }: RowActionsProps) {
  const router = useRouter();
  const canEdit = useHasPermission("popup_promotions", "edit");
  const canDelete = useHasPermission("popup_promotions", "delete");
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    router.push(`${ROUTES.POPUP_PROMOTIONS}/${promotion.popup_promotion_id}/edit`);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePopupPromotion(promotion.popup_promotion_id);
      if (result.success) {
        toast.success(`"${promotion.name}" moved to trash`);
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: handleEdit }] : []),
    ...(canDelete
      ? [{
          label: "Delete" as const,
          icon: Trash2,
          onClick: () => setShowDelete(true),
          variant: "destructive" as const,
        }]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />
      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete popup promotion?"
        description={
          <>
            <strong>&ldquo;{promotion.name}&rdquo;</strong> will be moved to the
            trash. You can restore it within 30 days.
          </>
        }
        isPending={isPending}
      />
    </>
  );
}
