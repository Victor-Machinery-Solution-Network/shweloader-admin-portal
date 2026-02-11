"use client";

import { useState, useTransition } from "react";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  approvePartner,
  rejectPartner,
  deletePartner,
} from "@/lib/actions/partner";
import type { PartnerWithDetails } from "@/types/partner";

interface RowActionsProps {
  partner: PartnerWithDetails;
}

export function RowActions({ partner }: RowActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPendingStatus = partner.status_name?.toLowerCase() === "pending";

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePartner(partner.id);
      if (result.success) {
        toast.success("Partner approved");
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  function handleReject(formData: FormData) {
    const reason = formData.get("rejection_reason") as string;
    startTransition(async () => {
      const result = await rejectPartner(partner.id, reason);
      if (result.success) {
        toast.success("Partner rejected");
        setShowReject(false);
      } else {
        toast.error(result.error ?? "Failed to reject");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePartner(partner.id);
      if (result.success) {
        toast.success("Partner request deleted");
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
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isPendingStatus && (
            <>
              <DropdownMenuItem onSelect={handleApprove} disabled={isPending}>
                <CheckCircle /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowReject(true)}>
                <XCircle /> Reject
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormDialog
        open={showReject}
        onOpenChange={setShowReject}
        title="Reject Partner"
        description={`Reject partner request from "${partner.customer_name ?? "Unknown"}".`}
        onSubmit={handleReject}
        isPending={isPending}
        submitLabel="Reject"
      >
        <div className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>Reason (optional)</FieldLabel>
            <FieldContent>
              <Input
                name="rejection_reason"
                placeholder="e.g. Incomplete documentation"
              />
            </FieldContent>
          </Field>
        </div>
      </FormDialog>

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete partner request?"
        description={`This will permanently delete the partner request from "${partner.customer_name ?? "Unknown"}". This action cannot be undone.`}
        isPending={isPending}
      />
    </>
  );
}
