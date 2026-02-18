"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle,
  XCircle,
  User,
  Handshake,
  ArrowLeft,
  Building2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { approvePartner, rejectPartner } from "@/lib/actions/partner";
import type { PartnerWithDetails } from "@/types/partner";

interface PartnerReviewDialogProps {
  partner: PartnerWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PartnerReviewDialog({
  partner,
  open,
  onOpenChange,
}: PartnerReviewDialogProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const isVerified = partner.customer_verified === 1;
  const isApproved = partner.status_name?.toLowerCase() === "approved";
  const isRejected = partner.status_name?.toLowerCase() === "rejected";
  const isRevoking = isApproved && isRejecting;

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePartner(partner.id);
      if (result.success) {
        toast.success("Partner approved");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectPartner(partner.id, rejectionReason);
      if (result.success) {
        toast.success(isApproved ? "Partner revoked" : "Partner rejected");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? (isApproved ? "Failed to revoke" : "Failed to reject"));
      }
    });
  }

  function handleOpenChange(value: boolean) {
    if (isPending) return;
    if (!value) {
      setIsRejecting(false);
      setRejectionReason("");
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle>
            {isApproved
              ? "Partner Details"
              : isRejected
                ? "Rejected Application"
                : "Review Partner Request"}
          </DialogTitle>
          <DialogDescription>
            Applied {formatDate(partner.applied_at)}
            {isApproved && partner.reviewed_at && (
              <> &middot; Approved {formatDate(partner.reviewed_at)}</>
            )}
            {isRejected && partner.reviewed_at && (
              <> &middot; Rejected {formatDate(partner.reviewed_at)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 p-1 -m-1">
          {/* Customer Profile */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" />
              Customer Profile
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Name" value={partner.customer_name} />
              <DetailRow label="Email" value={partner.customer_email} />
              <DetailRow label="Phone" value={partner.customer_phone} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Status</span>
                <Badge
                  variant={isVerified ? "success" : "destructive"}
                  className="text-xs"
                >
                  {isVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>
          </section>

          <Separator />

          {/* Business Info */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 text-muted-foreground" />
              Business
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Company" value={partner.customer_company} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Type</span>
                {partner.business_type_name ? (
                  <Badge variant="outline" className="text-xs">
                    {partner.business_type_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
              <DetailRow label="Address" value={partner.customer_address} />
            </div>
          </section>

          <Separator />

          {/* Partner Request */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Handshake className="size-4 text-muted-foreground" />
              Partner Request
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Partner Type</span>
                {partner.partner_type_name ? (
                  <Badge variant="outline" className="text-xs">
                    {partner.partner_type_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
              <DetailRow
                label="Applied"
                value={formatDate(partner.applied_at)}
              />
            </div>
          </section>

          <Separator />

          {/* Account */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4 text-muted-foreground" />
              Account
            </div>
            <div className="space-y-2.5">
              <DetailRow
                label="Customer ID"
                value={partner.customer_id ? `#${partner.customer_id}` : null}
              />
              <DetailRow
                label="Joined"
                value={partner.customer_joined ? formatDate(partner.customer_joined) : null}
              />
            </div>
          </section>

          {/* Previous Rejection Reason (read-only for rejected partners) */}
          {isRejected && partner.rejection_reason && (
            <>
              <Separator />
              <section className="flex flex-col gap-4">
                <span className="text-sm font-medium text-destructive">
                  Rejection Reason
                </span>
                <div className="rounded-lg bg-destructive/5 p-3 text-sm italic">
                  {partner.rejection_reason}
                </div>
              </section>
            </>
          )}

          {/* Rejection/Revoke Reason Input */}
          {!isRejected && isRejecting && (
            <>
              <Separator />
              <div className="flex flex-col gap-4">
                <label htmlFor="rejection-reason" className="text-sm font-medium">
                  {isApproved ? "Revoke Reason (optional)" : "Rejection Reason (optional)"}
                </label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={isApproved ? "e.g. Non-compliance with partner terms" : "e.g. Incomplete documentation"}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {isRevoking ? (
            /* Approved → Revoking: Back + Confirm Revoke */
            <>
              <Button
                variant="outline"
                onClick={() => setIsRejecting(false)}
                disabled={isPending}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Revoking&hellip;
                  </>
                ) : (
                  <>
                    <XCircle className="size-4" />
                    Confirm Revoke
                  </>
                )}
              </Button>
            </>
          ) : isApproved ? (
            /* Approved → Default: Close + Revoke */
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsRejecting(true)}
                disabled={isPending}
              >
                <XCircle className="size-4" />
                Revoke
              </Button>
            </>
          ) : isRejected ? (
            /* Rejected: Close + Approve */
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Close
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isPending}
                className="border-green-600/30 bg-green-600/10 text-green-700 hover:bg-green-600/20 hover:text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-400"
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Approving&hellip;
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" />
                    Approve
                  </>
                )}
              </Button>
            </>
          ) : isRejecting ? (
            /* Pending → Rejecting: Back + Confirm Reject */
            <>
              <Button
                variant="outline"
                onClick={() => setIsRejecting(false)}
                disabled={isPending}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Rejecting&hellip;
                  </>
                ) : (
                  <>
                    <XCircle className="size-4" />
                    Confirm Reject
                  </>
                )}
              </Button>
            </>
          ) : (
            /* Pending → Default: Close + Reject + Approve */
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsRejecting(true)}
                disabled={isPending}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isPending}
                className="border-green-600/30 bg-green-600/10 text-green-700 hover:bg-green-600/20 hover:text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-400"
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Approving&hellip;
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" />
                    Approve
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span
        className={`text-sm text-right ${value ? "" : "text-muted-foreground"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
