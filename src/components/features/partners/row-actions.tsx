"use client";

import { useState } from "react";
import { ClipboardPen, Eye, X } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PartnerReviewDialog } from "./partner-review-dialog";
import type { PartnerWithDetails } from "@/types/partner";

interface RowActionsProps {
  partner: PartnerWithDetails;
}

export function RowActions({ partner }: RowActionsProps) {
  const canApprove = useHasPermission("partners", "approve");
  const [showReview, setShowReview] = useState(false);
  const status = partner.status_name?.toLowerCase();
  const Icon = status === "approved" ? Eye : status === "rejected" ? X : ClipboardPen;
  const label = status === "approved" ? "View" : "Review";

  if (!canApprove) return null;

  return (
    <div className="flex justify-end">
      <TooltipProvider>
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
    </div>
  );
}
