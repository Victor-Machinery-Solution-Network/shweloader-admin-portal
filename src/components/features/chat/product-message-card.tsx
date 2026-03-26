import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/r2-url";

interface ProductMessageCardProps {
  productName: string | null;
  productThumbnail: string | null;
  listingType: "sale" | "rent" | null;
  listingId: number | null;
  productListId?: number | null;
  customId?: string | null;
  brandName: string | null;
  mmkPrice: number | null;
  usdPrice: number | null;
  displayCurrency: string | null;
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

export function ProductMessageCard({
  productName,
  productThumbnail,
  listingType,
  listingId,
  productListId,
  customId,
  brandName,
  mmkPrice,
  usdPrice,
  displayCurrency,
}: ProductMessageCardProps) {
  // Don't render if no product data at all
  if (!productName && !listingId) return null;

  // Listing was deleted — no product data
  if (!productName && listingId) {
    return (
      <div className="bg-muted/30 border rounded-xl px-3 py-2 text-xs text-muted-foreground italic">
        Listing unavailable
      </div>
    );
  }

  const listingUrl = productListId
    ? `/listings/${productListId}`
    : null;

  const priceDisplay = formatPrice(mmkPrice, usdPrice, displayCurrency);

  return (
    <div className="bg-muted/30 border rounded-xl p-2.5 flex gap-2.5 items-center">
      {/* Thumbnail */}
      <div className="relative size-12 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {productThumbnail ? (
          <Image
            src={assetUrl(productThumbnail) ?? ""}
            alt={productName ?? "Product"}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        {brandName && (
          <p className="text-[10px] uppercase text-muted-foreground tracking-wide truncate">
            {brandName}
          </p>
        )}
        <p className="text-sm font-semibold truncate">
          {productName ?? "Unnamed product"}
        </p>
        {customId && (
          <p className="text-[10px] text-muted-foreground">{customId}</p>
        )}
      </div>

      {/* Price + badge */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-xs font-medium ${listingType === "rent" ? "text-amber-500" : "text-blue-400"}`}>
          {priceDisplay}
        </span>
        {listingType && (
          <Badge
            variant={listingType === "sale" ? "equipment" : "attachment"}
            className="text-[10px]"
          >
            {listingType === "sale" ? "For Sale" : "For Rent"}
          </Badge>
        )}
      </div>

      {/* View link */}
      {listingUrl && (
        <Link
          href={listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="View Listing"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
