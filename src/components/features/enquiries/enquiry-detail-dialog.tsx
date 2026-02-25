"use client";

import { useTransition } from "react";
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
import { CheckCircle, Clock, User, Package, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { updateEnquiryStatus } from "@/lib/actions/enquiry";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

interface EnquiryDetailDialogProps {
  enquiry: EnquiryWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusTypes: EnquiryStatusType[];
}

export function EnquiryDetailDialog({
  enquiry,
  open,
  onOpenChange,
  statusTypes,
}: EnquiryDetailDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Enquiry Details
            {enquiry.status_name && (
              <Badge
                variant={isResolved ? "default" : "secondary"}
              >
                {enquiry.status_name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Submitted {formatDate(enquiry.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" />
              User
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <p className="font-medium">
                {enquiry.user_name ?? "Unknown"}
              </p>
              {enquiry.user_email && (
                <p className="text-muted-foreground">
                  {enquiry.user_email}
                </p>
              )}
              {enquiry.user_phone && (
                <p className="text-muted-foreground">
                  {enquiry.user_phone}
                </p>
              )}
              {enquiry.user_company && (
                <p className="text-muted-foreground">
                  {enquiry.user_company}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Product Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="size-4 text-muted-foreground" />
              Product
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {enquiry.model_name ?? "Unknown product"}
                </span>
                {enquiry.listing_type && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {enquiry.listing_type}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="size-4 text-muted-foreground" />
              Message
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
              {enquiry.message || "No message provided."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleToggleStatus} disabled={isPending}>
            {isPending ? (
              <Spinner />
            ) : isResolved ? (
              <Clock className="size-4" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            {isResolved ? "Mark Pending" : "Mark Resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
