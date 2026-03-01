"use client";

import { useState, useTransition } from "react";
import { Eye, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { EnquiryDetailDialog } from "./enquiry-detail-dialog";
import {
  updateEnquiryStatus,
  deleteEnquiry,
} from "@/lib/actions/enquiry";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

interface EnquiryRowActionsProps {
  enquiry: EnquiryWithDetails;
  statusTypes: EnquiryStatusType[];
}

export function EnquiryRowActions({
  enquiry,
  statusTypes,
}: EnquiryRowActionsProps) {
  const canEdit = useHasPermission("enquiries", "edit");
  const canDelete = useHasPermission("enquiries", "delete");
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isResolved = enquiry.status_name === "Resolved";
  const resolvedStatus = statusTypes.find(
    (s) => s.status_name === "Resolved",
  );
  const pendingStatus = statusTypes.find(
    (s) => s.status_name === "Pending",
  );

  function handleToggleStatus() {
    const targetStatus = isResolved ? pendingStatus : resolvedStatus;
    if (!targetStatus) return;

    startTransition(async () => {
      const result = await updateEnquiryStatus(enquiry.id, targetStatus.id);
      if (result.success) {
        toast.success(
          isResolved ? "Marked as pending" : "Marked as resolved",
        );
      } else {
        toast.error(result.error ?? "Failed to update status");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEnquiry(enquiry.id);
      if (result.success) {
        toast.success("Enquiry deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  return (
    <>
      <RowActionsUI
        actions={[
          {
            label: "View Details",
            icon: Eye,
            onClick: () => setShowDetail(true),
          },
          ...(canEdit
            ? [
                {
                  label: (isResolved ? "Mark Pending" : "Mark Resolved") as string,
                  icon: CheckCircle,
                  onClick: handleToggleStatus,
                  disabled: isPending,
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
        ]}
      />

      {showDetail && (
        <EnquiryDetailDialog
          enquiry={enquiry}
          open={showDetail}
          onOpenChange={setShowDetail}
          statusTypes={statusTypes}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete enquiry?"
        description={`The enquiry from "${enquiry.user_name ?? "Unknown"}" will be moved to the trash. You can restore it within 30 days.`}
        isPending={isPending}
      />
    </>
  );
}
