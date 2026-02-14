"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { approvePartner, rejectPartner } from "@/lib/actions/partner";
import type { PartnerWithDetails } from "@/types/partner";

interface RowActionsProps {
  partner: PartnerWithDetails;
}

export function RowActions({ partner }: RowActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  return (
    <>
      <RowActionsUI
        actions={[
          { label: "Approve", icon: CheckCircle, onClick: handleApprove, disabled: isPending },
          { label: "Reject", icon: XCircle, onClick: () => setShowReject(true) },
        ]}
      />

      {showReject && (
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
      )}
    </>
  );
}
