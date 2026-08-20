"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteDraft } from "@/lib/actions/listing";
import { useHasPermission } from "@/hooks/use-permissions";
import type { DraftListingWithDetails } from "@/types/listing";

interface DraftRowActionsProps {
  draft: DraftListingWithDetails;
}

export function DraftRowActions({ draft }: DraftRowActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Your own draft is always yours; someone else's needs the listing_drafts
  // verb. The server re-checks — this only keeps dead actions off the menu.
  const canEditOthers = useHasPermission("listing_drafts", "edit");
  const canDeleteOthers = useHasPermission("listing_drafts", "delete");
  const canEdit = draft.is_own || canEditOthers;
  const canDelete = draft.is_own || canDeleteOthers;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDraft(draft.id);
      if (result.success) {
        toast.success("Draft deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete draft");
      }
    });
  }

  return (
    <>
      <RowActionsUI
        actions={[
          ...(canEdit
            ? [
                {
                  label: "Edit",
                  icon: Pencil,
                  onClick: () =>
                    router.push(`/listings/drafts/${draft.id}/edit`),
                },
              ]
            : []),
          ...(canDelete
            ? [
                {
                  label: "Delete",
                  icon: Trash2,
                  onClick: () => setShowDelete(true),
                  variant: "destructive" as const,
                },
              ]
            : []),
        ]}
      />

      {showDelete && (
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete draft?</AlertDialogTitle>
              <AlertDialogDescription>
                The draft{draft.model_name ? ` "${draft.model_name}"` : ""}
                {draft.is_own ? "" : `, created by ${draft.created_by_name ?? "another admin"},`} will
                be moved to the trash. You can restore it within 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                {isPending ? "Deleting\u2026" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
