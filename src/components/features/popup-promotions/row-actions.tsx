"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ROUTES } from "@/lib/constants";
import type { PopupPromotion } from "@/types/popup-promotion";

interface RowActionsProps {
  promotion: PopupPromotion;
}

export function RowActions({ promotion }: RowActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    router.push(`${ROUTES.POPUP_PROMOTIONS}/${promotion.popup_promotion_id}/edit`);
  }

  function handleDelete() {
    startTransition(async () => {
      // UI-only prototype — backend not wired
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success(`"${promotion.name}" deleted (mock — no backend wired)`);
      setShowDelete(false);
    });
  }

  const actions = [
    { label: "Edit" as const, icon: Pencil, onClick: handleEdit },
    {
      label: "Delete" as const,
      icon: Trash2,
      onClick: () => setShowDelete(true),
      variant: "destructive" as const,
    },
  ];

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
