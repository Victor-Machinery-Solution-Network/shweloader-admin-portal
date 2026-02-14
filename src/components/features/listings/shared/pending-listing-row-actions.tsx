"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ListingForm } from "./listing-form";
import {
  approveListingSale,
  approveListingRent,
  rejectListingSale,
  rejectListingRent,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  ApprovedPartner,
} from "@/types/listing";
import type { EquipmentModel } from "@/types/equipment";
import type { AttachmentModel } from "@/types/attachment";
import type { Location } from "@/types/location";

interface PendingListingRowActionsProps {
  listing: SaleListingWithDetails | RentListingWithDetails;
  pageType: "sale" | "rent";
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
}

export function PendingListingRowActions({
  listing,
  pageType,
  partners,
  equipmentModels,
  attachmentModels,
  locations,
}: PendingListingRowActionsProps) {
  const [showView, setShowView] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleApprove(closeView = false) {
    const approveFn =
      pageType === "sale" ? approveListingSale : approveListingRent;
    startTransition(async () => {
      const result = await approveFn(listing.id);
      if (result.success) {
        toast.success("Listing approved");
        if (closeView) {
          setShowView(false);
        }
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  function handleReject(formData: FormData) {
    const reason = formData.get("rejection_reason") as string;
    const rejectFn =
      pageType === "sale" ? rejectListingSale : rejectListingRent;
    startTransition(async () => {
      const result = await rejectFn(listing.id, reason);
      if (result.success) {
        toast.success("Listing rejected");
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
          { label: "View", icon: ExternalLink, onClick: () => setShowView(true) },
          { label: "Approve", icon: CheckCircle, onClick: () => handleApprove(), disabled: isPending },
          { label: "Reject", icon: XCircle, onClick: () => setShowReject(true) },
        ]}
      />

      {/* View listing details */}
      <ListingForm
        open={showView}
        onOpenChange={setShowView}
        pageType={pageType}
        listing={listing}
        partners={partners}
        equipmentModels={equipmentModels}
        attachmentModels={attachmentModels}
        locations={locations}
        onApprove={() => handleApprove(true)}
        isApproving={isPending}
      />

      {/* Reject with reason dialog */}
      <FormDialog
        open={showReject}
        onOpenChange={setShowReject}
        title="Reject Listing"
        description={`Reject listing "${listing.model_name ?? "Unknown"}".`}
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
                placeholder="e.g. Incomplete listing details"
              />
            </FieldContent>
          </Field>
        </div>
      </FormDialog>
    </>
  );
}
