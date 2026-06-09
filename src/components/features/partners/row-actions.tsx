"use client";

import { useState } from "react";
import { ClipboardPen, Eye, Pencil, X } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PartnerReviewDialog } from "./partner-review-dialog";
import { EditPartnerTypeDialog } from "./edit-partner-type-dialog";
import type { PartnerWithDetails } from "@/types/partner";

interface RowActionsProps {
  partner: PartnerWithDetails;
  partnerTypes: { id: number; name: string }[];
}

export function RowActions({ partner, partnerTypes }: RowActionsProps) {
  const canApprove = useHasPermission("partners", "approve");
  const [showReview, setShowReview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const status = partner.status_name?.toLowerCase();
  const Icon = status === "approved" ? Eye : status === "rejected" ? X : ClipboardPen;
  const label = status === "approved" ? "View" : "Review";

  if (!canApprove) return null;

  return (
    <div className="flex justify-end gap-1">
      <TooltipProvider>
        {status === "approved" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowEdit(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil aria-hidden="true" />
                <span className="sr-only">Edit partner type</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Edit type</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowReview(true)}
              className={status === "rejected" ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"}
            >
              <Icon aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showReview && (
        <PartnerReviewDialog
          partner={partner}
          open={showReview}
          onOpenChange={setShowReview}
        />
      )}

      {showEdit && (
        <EditPartnerTypeDialog
          partner={partner}
          partnerTypes={partnerTypes}
          open={showEdit}
          onOpenChange={setShowEdit}
        />
      )}
    </div>
  );
}
