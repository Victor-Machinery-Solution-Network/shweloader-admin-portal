"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  approveListingSale,
  approveListingRent,
  requestReworkSale,
  requestReworkRent,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
} from "@/types/listing";

interface PendingListingRowActionsProps {
  listing: SaleListingWithDetails | RentListingWithDetails;
  pageType: "sale" | "rent";
}

export function PendingListingRowActions({
  listing,
  pageType,
}: PendingListingRowActionsProps) {
  const router = useRouter();
  const feature = pageType === "sale" ? "sale_listings" : "rent_listings";
  const canApprove = useHasPermission(feature, "approve");
  const [showRework, setShowRework] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isRework = listing.approve_status_name === "Rework";

  function handleApprove() {
    const approveFn =
      pageType === "sale" ? approveListingSale : approveListingRent;
    startTransition(async () => {
      const result = await approveFn(listing.id);
      if (result.success) {
        toast.success("Listing approved");
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  function handleRequestRework(formData: FormData) {
    const reason = formData.get("rework_reason") as string;
    const reworkFn =
      pageType === "sale" ? requestReworkSale : requestReworkRent;
    startTransition(async () => {
      const result = await reworkFn(listing.id, reason);
      if (result.success) {
        toast.success("Listing sent for rework");
        setShowRework(false);
      } else {
        toast.error(result.error ?? "Failed to request rework");
      }
    });
  }

  return (
    <>
      <RowActionsUI
        actions={[
          {
            label: "View",
            icon: ExternalLink,
            onClick: () =>
              router.push(`/listings/for-${pageType}/${listing.id}/edit`),
          },
          ...(canApprove && !isRework
            ? [
                {
                  label: "Approve" as const,
                  icon: CheckCircle,
                  onClick: handleApprove,
                  disabled: isPending,
                },
                {
                  label: "Request Rework" as const,
                  icon: XCircle,
                  onClick: () => setShowRework(true),
                },
              ]
            : []),
        ]}
      />

      {/* Request rework with reason dialog */}
      {showRework && (
        <FormDialog
          open={showRework}
          onOpenChange={setShowRework}
          title="Request Rework"
          description={`Request rework for listing "${listing.model_name ?? "Unknown"}".`}
          icon={<XCircle className="text-primary-foreground size-6" />}
          onSubmit={handleRequestRework}
          isPending={isPending}
          submitLabel="Request Rework"
        >
          <div className="space-y-4">
            <Field orientation="vertical">
              <FieldLabel>Reason (optional)</FieldLabel>
              <FieldContent>
                <Input
                  name="rework_reason"
                  placeholder="e.g. Incomplete listing details"
                />
              </FieldContent>
            </Field>
          </div>
        </FormDialog>
      )}
    </>
  );
}
