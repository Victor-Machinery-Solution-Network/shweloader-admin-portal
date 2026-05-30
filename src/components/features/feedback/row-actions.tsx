"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { deleteFeedback } from "@/lib/actions/feedback";
import type { AppFeedbackWithUser } from "@/types/feedback";

interface RowActionsProps {
  feedback: AppFeedbackWithUser;
}

export function RowActions({ feedback }: RowActionsProps) {
  const canDelete = useHasPermission("feedback", "delete");
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFeedback(feedback.id);
      if (result.success) {
        toast.success("Feedback deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  if (!canDelete) return null;

  return (
    <>
      <RowActionsUI
        actions={[
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive",
          },
        ]}
      />

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete feedback?"
        description="This feedback will be permanently deleted. This action cannot be undone."
        isPending={isPending}
      />
    </>
  );
}
