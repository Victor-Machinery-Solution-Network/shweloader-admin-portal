"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const feature = pageType === "sale" ? "sale_listings" : "rent_listings";
  const canApprove = useHasPermission(feature, "approve");

  if (!canApprove) return null;

  return (
    <div className="flex justify-end">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={`/listings/for-${pageType}/${listing.id}/edit`}>
                <ClipboardList aria-hidden="true" />
                <span className="sr-only">Review</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Review</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
