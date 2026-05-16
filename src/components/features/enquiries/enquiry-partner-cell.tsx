"use client";

import { useState, useTransition } from "react";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import { getPartnerDetails } from "@/lib/actions/partner";
import { PartnerReviewDialog } from "@/components/features/partners/partner-review-dialog";
import type { PartnerWithDetails } from "@/types/partner";

interface EnquiryPartnerCellProps {
  partnerId: number | null;
  partnerUsername: string | null;
  partnerName: string | null;
}

/**
 * Partner cell for the enquiry table. Click loads the full partner row + joins
 * and opens the same PartnerReviewDialog used on the /partners page (status
 * badge, business info, applied/approved dates, approve/reject/revoke).
 */
export function EnquiryPartnerCell({
  partnerId,
  partnerUsername,
  partnerName,
}: EnquiryPartnerCellProps) {
  const [partner, setPartner] = useState<PartnerWithDetails | null>(null);
  const [isLoading, startTransition] = useTransition();

  if (!partnerUsername && !partnerName) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  function handleClick() {
    if (!partnerId || isLoading || partner) return;
    startTransition(async () => {
      const result = await getPartnerDetails(partnerId);
      if (!result) {
        toast.error("Partner not found");
        return;
      }
      setPartner(result);
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
        <Handshake className="size-3.5 text-emerald-500" />
      </div>
      <div className="flex flex-col min-w-0">
        {partnerId && partnerUsername ? (
          <button
            type="button"
            onClick={handleClick}
            disabled={isLoading}
            className="font-medium text-sm text-left hover:underline cursor-pointer w-fit truncate disabled:opacity-60"
          >
            {partnerUsername}
          </button>
        ) : (
          <span className="font-medium text-sm truncate">
            {partnerUsername ?? "—"}
          </span>
        )}
        <span className="text-muted-foreground text-xs truncate">
          {partnerName ?? "—"}
        </span>
      </div>

      {partner && (
        <PartnerReviewDialog
          partner={partner}
          open={!!partner}
          onOpenChange={(open) => !open && setPartner(null)}
          readOnly
        />
      )}
    </div>
  );
}
