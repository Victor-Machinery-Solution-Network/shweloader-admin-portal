"use client";

import Image from "next/image";
import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  EyeOff,
  PackageX,
  PackageCheck,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingRowActions } from "./listing-row-actions";
import {
  toggleSaleHidden,
  toggleRentHidden,
  toggleSoldOut,
  addToFeatured,
  removeFromFeatured,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  ApprovedPartner,
  ConditionType,
} from "@/types/listing";
import type { EquipmentModel } from "@/types/equipment";
import type { AttachmentModel } from "@/types/attachment";
import type { Location } from "@/types/location";

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

  return (
    <Button
      variant={isHidden ? "destructive" : "outline"}
      size="icon-sm"
      disabled={isPending}
      title={isHidden ? "Show listing" : "Hide listing"}
      aria-label={isHidden ? "Show listing" : "Hide listing"}
      className={
        isHidden
          ? "rounded-full"
          : "text-muted-foreground rounded-full border-dashed"
      }
      onClick={() => startTransition(() => onToggle())}
    >
      {isHidden ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
    </Button>
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

  return (
    <Button
      variant={isSoldOut ? "destructive" : "outline"}
      size="icon-sm"
      disabled={isPending}
      title={isSoldOut ? "Mark available" : "Mark sold out"}
      aria-label={isSoldOut ? "Mark available" : "Mark sold out"}
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

  return (
    <Button
      variant={isFeatured ? "default" : "outline"}
      size="icon-sm"
      disabled={isPending}
      title={isFeatured ? "Remove from featured" : "Feature on home page"}
      aria-label={isFeatured ? "Remove from featured" : "Feature on home page"}
      className={
        isFeatured
          ? "rounded-full"
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
        <Star aria-hidden="true" className="size-5 fill-current" />
      ) : (
        <StarOff aria-hidden="true" className="size-5" />
      )}
    </Button>
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
        <Image src={url} alt="" width={40} height={40} className="rounded-md object-cover" unoptimized />
      ) : (
        <div className="bg-muted size-10 rounded-md" />
      );
    },
    size: 44,
    minSize: 44,
    maxSize: 44,
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

// --- Reference data type for column factories ---

interface ReferenceData {
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
  conditionTypes: ConditionType[];
  exchangeRate: number;
}

// --- Sale Columns ---

export function createSaleColumns(
  partners: ApprovedPartner[],
  equipmentModels: EquipmentModel[],
  attachmentModels: AttachmentModel[],
  locations: Location[],
  conditionTypes: ConditionType[],
  exchangeRate: number,
): ColumnDef<SaleListingWithDetails>[] {
  const ref: ReferenceData = {
    partners,
    equipmentModels,
    attachmentModels,
    locations,
    conditionTypes,
    exchangeRate,
  };

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
        const { id, is_hidden, is_sold_out, featured_id } = row.original;
        return (
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
            <SoldOutToggle isSoldOut={is_sold_out === 1} listingId={id} />
            <FeatureToggle
              featuredId={featured_id}
              listingType="sale"
              listingId={id}
            />
            <ListingRowActions
              listing={row.original}
              pageType="sale"
              {...ref}
            />
          </div>
        );
      },
    },
  ];
}

// --- Rent Columns ---

export function createRentColumns(
  partners: ApprovedPartner[],
  equipmentModels: EquipmentModel[],
  attachmentModels: AttachmentModel[],
  locations: Location[],
  conditionTypes: ConditionType[],
  exchangeRate: number,
): ColumnDef<RentListingWithDetails>[] {
  const ref: ReferenceData = {
    partners,
    equipmentModels,
    attachmentModels,
    locations,
    conditionTypes,
    exchangeRate,
  };

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
        const { id, is_hidden, featured_id } = row.original;
        return (
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
            <FeatureToggle
              featuredId={featured_id}
              listingType="rent"
              listingId={id}
            />
            <ListingRowActions
              listing={row.original}
              pageType="rent"
              {...ref}
            />
          </div>
        );
      },
    },
  ];
}
