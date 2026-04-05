"use client";

import { useState, useTransition } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
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
import { Spinner } from "@/components/ui/spinner";
import { deletePromotionPush, resendPromotionPush } from "@/lib/actions/promotion";
import type { PromotionPush } from "@/types/promotion";

interface RowActionsProps {
  promotion: PromotionPush;
}

export function RowActions({ promotion }: RowActionsProps) {
  const canCreate = useHasPermission("promotions", "create");
  const canDelete = useHasPermission("promotions", "delete");
  const [showResend, setShowResend] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [resendPending, startResendTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function handleResend() {
    startResendTransition(async () => {
      const result = await resendPromotionPush(promotion.promotion_push_id);
      if (result.success) {
        toast.success("Promotion resent to all devices");
        setShowResend(false);
      } else {
        toast.error(result.error ?? "Failed to resend promotion");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deletePromotionPush(promotion.promotion_push_id);
      if (result.success) {
        toast.success("Promotion deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete promotion");
      }
    });
  }

  const actions = [
    ...(canCreate
      ? [
          {
            label: "Resend" as const,
            icon: Send,
            onClick: () => setShowResend(true),
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
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      <AlertDialog open={showResend} onOpenChange={setShowResend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send &ldquo;{promotion.title}&rdquo; as a new push
              notification to all registered devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resendPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResend();
              }}
              disabled={resendPending}
            >
              {resendPending ? (
                <>
                  <Spinner className="mr-1" /> Sending&hellip;
                </>
              ) : (
                "Resend"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete promotion?"
        description="The promotion will be moved to the trash. You can restore it within 30 days."
        isPending={deletePending}
      />
    </>
  );
}
