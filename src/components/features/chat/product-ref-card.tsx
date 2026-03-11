"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductRefCardProps {
  productName: string | null;
  productThumbnail: string | null;
  listingType: "sale" | "rent" | null;
  listingId: number | null;
  brandName: string | null;
  mmkPrice: number | null;
  usdPrice: number | null;
  displayCurrency: string | null;
  partnerName: string | null;
}

function formatPrice(
  mmkPrice: number | null,
  usdPrice: number | null,
  displayCurrency: string | null,
): string {
  if (displayCurrency === "USD" && usdPrice != null) {
    return `$${usdPrice.toLocaleString()}`;
  }
  if (mmkPrice != null) {
    return `${mmkPrice.toLocaleString()} MMK`;
  }
  if (usdPrice != null) {
    return `$${usdPrice.toLocaleString()}`;
  }
  return "Price on request";
}

export function ProductRefCard({
  productName,
  productThumbnail,
  listingType,
  listingId,
  brandName,
  mmkPrice,
  usdPrice,
  displayCurrency,
  partnerName,
}: ProductRefCardProps) {
  if (!productName && !listingId) return null;

  const listingUrl =
    listingType && listingId
      ? `/listings/for-${listingType === "sale" ? "sale" : "rent"}/${listingId}/edit`
      : null;

  const priceDisplay = formatPrice(mmkPrice, usdPrice, displayCurrency);

  return (
    <div className="border border-border rounded-xl bg-muted/30 p-3 flex gap-3 items-start">
      {/* Thumbnail */}
      <div className="size-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {productThumbnail ? (
          <Image
            src={productThumbnail}
            alt={productName ?? "Product"}
            width={56}
            height={56}
            className="object-cover size-full"
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {brandName && (
              <p className="text-xs text-muted-foreground truncate">{brandName}</p>
            )}
            <p className="text-sm font-medium truncate">
              {productName ?? "Unnamed product"}
            </p>
            {partnerName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {partnerName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {listingType && (
              <Badge
                variant={listingType === "sale" ? "equipment" : "attachment"}
                className="text-xs"
              >
                {listingType === "sale" ? "For Sale" : "For Rent"}
              </Badge>
            )}
            <span className="text-xs font-medium text-foreground">
              {priceDisplay}
            </span>
          </div>
        </div>

        {listingUrl && (
          <Button
            variant="link"
            size="xs"
            className={cn("mt-1 px-0 h-auto text-xs")}
            asChild
          >
            <Link href={listingUrl} target="_blank" rel="noopener noreferrer">
              View Listing
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
