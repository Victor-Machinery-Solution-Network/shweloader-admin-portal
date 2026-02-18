"use client";

import Image from "next/image";
import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  EyeOff,
  DollarSign,
  PackageX,
  PackageCheck,
  Pin,
  PinOff,
} from "lucide-react";

/** DollarSign with diagonal slash — short ticks keep the center clean */
function DollarSignOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <line x1="12" x2="12" y1="2" y2="4" />
      <line x1="12" x2="12" y1="20" y2="22" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListingRowActions } from "./listing-row-actions";
import {
  toggleSaleHidden,
  toggleRentHidden,
  toggleSoldOut,
  toggleSaleHidePrice,
  toggleRentHidePrice,
  addToFeatured,
  removeFromFeatured,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
} from "@/types/listing";

// --- Common listing shape (fields shared by sale & rent) ---

type ListingBase = {
  thumbnail_url: string | null;
  model_name: string | null;
  partner_name: string | null;
  product_type: string;
  mmk_price: number | null;
  usd_price: number | null;
};

// --- Inline Pill Toggle Components ---

function HiddenToggle({
  isHidden,
  onToggle,
}: {
  isHidden: boolean;
  onToggle: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const label = isHidden ? "Show listing" : "Hide listing";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isHidden ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isHidden
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() => startTransition(() => onToggle())}
        >
          {isHidden ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function HidePriceToggle({
  hidePrice,
  onToggle,
}: {
  hidePrice: boolean;
  onToggle: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const label = hidePrice ? "Show price" : "Hide price";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={hidePrice ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            hidePrice
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() => startTransition(() => onToggle())}
        >
          {hidePrice ? <DollarSignOff aria-hidden="true" className="size-5" /> : <DollarSign aria-hidden="true" className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function SoldOutToggle({
  isSoldOut,
  listingId,
}: {
  isSoldOut: boolean;
  listingId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const label = isSoldOut ? "Mark available" : "Mark sold out";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isSoldOut ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isSoldOut
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() =>
            startTransition(async () => {
              const result = await toggleSoldOut(listingId);
              if (result.success) {
                toast.success(
                  result.is_sold_out ? "Marked as sold out" : "Marked as available",
                );
              } else {
                toast.error(result.error ?? "Failed to toggle");
              }
            })
          }
        >
          {isSoldOut ? (
            <PackageX aria-hidden="true" className="size-5" />
          ) : (
            <PackageCheck aria-hidden="true" className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function FeatureToggle({
  featuredId,
  listingType,
  listingId,
}: {
  featuredId: number | null;
  listingType: "sale" | "rent";
  listingId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const isFeatured = featuredId != null;
  const label = isFeatured ? "Remove from featured" : "Feature on home page";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isFeatured
              ? "rounded-full border-transparent bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() =>
            startTransition(async () => {
              if (isFeatured) {
                const result = await removeFromFeatured(featuredId);
                if (result.success) {
                  toast.success("Removed from featured");
                } else {
                  toast.error(result.error ?? "Failed to remove");
                }
              } else {
                const result = await addToFeatured(listingType, listingId);
                if (result.success) {
                  toast.success("Featured on home page");
                } else {
                  toast.error(result.error ?? "Failed to feature");
                }
              }
            })
          }
        >
          {isFeatured ? (
            <Pin aria-hidden="true" className="size-5 fill-current" />
          ) : (
            <PinOff aria-hidden="true" className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

// --- Shared column factories ---

function thumbnailColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "thumbnail",
    header: "",
    cell: ({ row }) => {
      const url = row.original.thumbnail_url;
      return url ? (
        <div className="size-11 shrink-0 overflow-hidden rounded-lg border bg-muted">
          <Image src={url} alt="" width={44} height={44} className="size-full object-cover" unoptimized />
        </div>
      ) : (
        <div className="size-11 shrink-0 rounded-lg border bg-muted" />
      );
    },
    size: 56,
    minSize: 56,
    maxSize: 56,
    enableResizing: false,
  };
}

function modelColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    accessorKey: "model_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Model" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.model_name ?? "\u2014"}</span>
    ),
    minSize: 120,
  };
}

function partnerColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    accessorKey: "partner_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.partner_name ?? "\u2014"}</span>
    ),
  };
}

function productTypeColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "product_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs capitalize">
        {row.original.product_type}
      </Badge>
    ),
  };
}

function priceColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const { mmk_price, usd_price } = row.original;
      const hasMmk = mmk_price != null;
      const hasUsd = usd_price != null;

      if (!hasMmk && !hasUsd) {
        return (
          <span className="text-sm text-muted-foreground">{"\u2014"}</span>
        );
      }

      return (
        <div className="text-sm tabular-nums">
          {hasMmk && (
            <span className="font-medium">
              {Number(mmk_price).toLocaleString()} MMK
            </span>
          )}
          {hasUsd && (
            <span className="text-muted-foreground ml-1.5">
              {hasMmk ? "(" : ""}${Number(usd_price).toLocaleString()}
              {hasMmk ? ")" : ""}
            </span>
          )}
        </div>
      );
    },
  };
}

// --- Sale Columns ---

export function createSaleColumns(): ColumnDef<SaleListingWithDetails>[] {
  return [
    thumbnailColumn<SaleListingWithDetails>(),
    modelColumn<SaleListingWithDetails>(),
    partnerColumn<SaleListingWithDetails>(),
    productTypeColumn<SaleListingWithDetails>(),
    {
      accessorKey: "condition_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Condition" />
      ),
      cell: ({ row }) => {
        const condition = row.original.condition_name;
        return condition ? (
          <span className="text-sm">{condition}</span>
        ) : (
          <span className="text-muted-foreground text-sm">{"\u2014"}</span>
        );
      },
    },
    priceColumn<SaleListingWithDetails>(),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const { id, is_hidden, is_sold_out, hide_price, featured_id } = row.original;
        return (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <HiddenToggle
                isHidden={is_hidden === 1}
                onToggle={async () => {
                  const result = await toggleSaleHidden(id);
                  if (result.success) {
                    toast.success(
                      result.is_hidden ? "Listing hidden" : "Listing visible",
                    );
                  } else {
                    toast.error(result.error ?? "Failed to toggle");
                  }
                }}
              />
              <HidePriceToggle
                hidePrice={hide_price === 1}
                onToggle={async () => {
                  const result = await toggleSaleHidePrice(id);
                  if (result.success) {
                    toast.success(
                      result.hide_price ? "Price hidden" : "Price visible",
                    );
                  } else {
                    toast.error(result.error ?? "Failed to toggle");
                  }
                }}
              />
              <SoldOutToggle isSoldOut={is_sold_out === 1} listingId={id} />
              <FeatureToggle
                featuredId={featured_id}
                listingType="sale"
                listingId={id}
              />
              <ListingRowActions
                listing={row.original}
                pageType="sale"
              />
            </div>
          </TooltipProvider>
        );
      },
    },
  ];
}

// --- Rent Columns ---

export function createRentColumns(): ColumnDef<RentListingWithDetails>[] {
  return [
    thumbnailColumn<RentListingWithDetails>(),
    modelColumn<RentListingWithDetails>(),
    partnerColumn<RentListingWithDetails>(),
    productTypeColumn<RentListingWithDetails>(),
    priceColumn<RentListingWithDetails>(),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const { id, is_hidden, hide_price, featured_id } = row.original;
        return (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <HiddenToggle
                isHidden={is_hidden === 1}
                onToggle={async () => {
                  const result = await toggleRentHidden(id);
                  if (result.success) {
                    toast.success(
                      result.is_hidden ? "Listing hidden" : "Listing visible",
                    );
                  } else {
                    toast.error(result.error ?? "Failed to toggle");
                  }
                }}
              />
              <HidePriceToggle
                hidePrice={hide_price === 1}
                onToggle={async () => {
                  const result = await toggleRentHidePrice(id);
                  if (result.success) {
                    toast.success(
                      result.hide_price ? "Price hidden" : "Price visible",
                    );
                  } else {
                    toast.error(result.error ?? "Failed to toggle");
                  }
                }}
              />
              <FeatureToggle
                featuredId={featured_id}
                listingType="rent"
                listingId={id}
              />
              <ListingRowActions
                listing={row.original}
                pageType="rent"
              />
            </div>
          </TooltipProvider>
        );
      },
    },
  ];
}
