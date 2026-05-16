"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { assetUrl } from "@/lib/r2-url";
import type { PopupPromotion } from "@/types/popup-promotion";
import type { PopupListingOption } from "@/lib/cache";

interface LinkedProductsCellProps {
  promotion: PopupPromotion;
  listings: PopupListingOption[];
}

function formatPrice(l: PopupListingOption): string {
  if (l.price_mmk != null) return `${l.price_mmk.toLocaleString()} MMK`;
  if (l.price_usd != null) return `$${l.price_usd.toLocaleString()}`;
  return "Price on request";
}

export function LinkedProductsCell({ promotion, listings }: LinkedProductsCellProps) {
  const [open, setOpen] = useState(false);
  const ids = promotion.linked_listing_ids;
  const count = ids.length;

  const linked = listings.filter((l) => ids.includes(l.listing_id));

  if (count === 0) {
    return (
      <span className="text-sm tabular-nums text-muted-foreground">0</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm tabular-nums hover:underline cursor-pointer w-fit"
      >
        {count} {count === 1 ? "product" : "products"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Linked products</DialogTitle>
            <DialogDescription>
              {count} product{count === 1 ? "" : "s"} linked to{" "}
              <strong>&ldquo;{promotion.name}&rdquo;</strong>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <ul className="space-y-1 pr-1">
              {linked.map((l) => {
                const thumbSrc = assetUrl(l.thumb_url);
                return (
                  <li key={l.listing_id}>
                    <Link
                      href={`/listings/${l.listing_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                        {thumbSrc ? (
                          <Image
                            src={thumbSrc}
                            alt={l.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <Package
                            aria-hidden="true"
                            className="size-5 text-muted-foreground/60"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {l.brand_name && (
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                            {l.brand_name}
                          </p>
                        )}
                        <p className="text-sm font-semibold truncate">
                          {l.title}
                        </p>
                        {l.custom_id && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {l.custom_id}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={
                              "text-xs font-medium " +
                              (l.listing_type === "rent"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-blue-600 dark:text-blue-400")
                            }
                          >
                            {formatPrice(l)}
                          </span>
                          {l.listing_type && (
                            <Badge
                              variant={
                                l.listing_type === "sale"
                                  ? "equipment"
                                  : "attachment"
                              }
                              className="text-[10px]"
                            >
                              {l.listing_type === "sale"
                                ? "For Sale"
                                : "For Rent"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ExternalLink
                        aria-hidden="true"
                        className="size-4 shrink-0 mt-1 text-muted-foreground group-hover:text-foreground transition-colors"
                      />
                    </Link>
                  </li>
                );
              })}
              {linked.length < count && (
                <li className="p-2 text-xs text-muted-foreground italic">
                  ({count - linked.length} linked product
                  {count - linked.length === 1 ? "" : "s"} no longer available)
                </li>
              )}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
