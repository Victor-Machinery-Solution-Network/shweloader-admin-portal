"use client";


import type { ColumnDef } from "@tanstack/react-table";
import { assetUrl } from "@/lib/r2-url";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PendingListingRowActions } from "./pending-listing-row-actions";
import { ListingThumbnail } from "./listing-thumbnail";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
} from "@/types/listing";

// --- Common listing shape ---

type ListingBase = {
  thumbnail_url: string | null;
  model_name: string | null;
  partner_name: string | null;
  product_type: string;
  mmk_price: number | null;
  usd_price: number | null;
  use_system_rate: number;
};

function hasPositivePrice(value: number | null | undefined) {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0;
}

// --- Shared column helpers ---

function productInfoColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    accessorKey: "model_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => {
      const src = assetUrl(row.original.thumbnail_url);
      const customId = (row.original as Record<string, unknown>).custom_id as string | null;
      return (
        <div className="flex items-center gap-3">
          <ListingThumbnail src={src} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.model_name ?? "\u2014"}</p>
            {customId && (
              <p className="truncate text-xs text-muted-foreground font-mono">{customId}</p>
            )}
          </div>
        </div>
      );
    },
    minSize: 200,
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
    accessorFn: (row) => row.product_type,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.product_type;
      return (
        <Badge
          variant={type === "equipment" ? "equipment" : "attachment"}
          className="text-xs capitalize"
        >
          {type}
        </Badge>
      );
    },
  };
}

function priceColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const { mmk_price, usd_price, use_system_rate } = row.original;
      const hasMmk = hasPositivePrice(mmk_price);
      const hasUsd = hasPositivePrice(usd_price);
      const rateLabel =
        use_system_rate === 0 ? "Custom Rate" : "System Rate";

      if (!hasMmk && !hasUsd) {
        return (
          <span className="text-muted-foreground text-xs">
            Check with Supplier
          </span>
        );
      }

      return (
        <div className="tabular-nums">
          {hasMmk && (
            <p className="text-sm font-medium">
              {Number(mmk_price).toLocaleString()}{" "}
              <span className="text-muted-foreground font-normal">MMK</span>
            </p>
          )}
          {hasUsd && (
            <p className="text-xs text-muted-foreground">
              ${Number(usd_price).toLocaleString()} ({rateLabel})
            </p>
          )}
        </div>
      );
    },
  };
}

function submittedColumn<T extends { created_at: string }>(): ColumnDef<T> {
  return {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Submitted" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {formatDate(row.original.created_at)}
      </span>
    ),
  };
}

// --- Rework reason column ---

function reworkReasonColumn<T extends { rejection_reason: string | null }>(): ColumnDef<T> {
  return {
    accessorKey: "rejection_reason",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
    cell: ({ row }) => {
      const reason = row.original.rejection_reason;
      if (!reason) {
        return <span className="text-muted-foreground text-sm">{"\u2014"}</span>;
      }
      return (
        <span className="text-sm text-muted-foreground line-clamp-2 max-w-60">{reason}</span>
      );
    },
  };
}

// --- Pending Sale Columns ---

export function createPendingSaleColumns(): ColumnDef<SaleListingWithDetails>[] {
  return [
    productInfoColumn<SaleListingWithDetails>(),
    partnerColumn<SaleListingWithDetails>(),
    productTypeColumn<SaleListingWithDetails>(),
    priceColumn<SaleListingWithDetails>(),
    submittedColumn<SaleListingWithDetails>(),
    {
      id: "actions",
      cell: ({ row }) => (
        <PendingListingRowActions
          listing={row.original}
          pageType="sale"
        />
      ),
    },
  ];
}

// --- Pending Rent Columns ---

export function createPendingRentColumns(): ColumnDef<RentListingWithDetails>[] {
  return [
    productInfoColumn<RentListingWithDetails>(),
    partnerColumn<RentListingWithDetails>(),
    productTypeColumn<RentListingWithDetails>(),
    priceColumn<RentListingWithDetails>(),
    submittedColumn<RentListingWithDetails>(),
    {
      id: "actions",
      cell: ({ row }) => (
        <PendingListingRowActions
          listing={row.original}
          pageType="rent"
        />
      ),
    },
  ];
}

// --- Rework Sale Columns ---

export function createReworkSaleColumns(): ColumnDef<SaleListingWithDetails>[] {
  return [
    productInfoColumn<SaleListingWithDetails>(),
    partnerColumn<SaleListingWithDetails>(),
    productTypeColumn<SaleListingWithDetails>(),
    reworkReasonColumn<SaleListingWithDetails>(),
    submittedColumn<SaleListingWithDetails>(),
    {
      id: "actions",
      cell: ({ row }) => (
        <PendingListingRowActions
          listing={row.original}
          pageType="sale"
        />
      ),
    },
  ];
}

// --- Rework Rent Columns ---

export function createReworkRentColumns(): ColumnDef<RentListingWithDetails>[] {
  return [
    productInfoColumn<RentListingWithDetails>(),
    partnerColumn<RentListingWithDetails>(),
    productTypeColumn<RentListingWithDetails>(),
    reworkReasonColumn<RentListingWithDetails>(),
    submittedColumn<RentListingWithDetails>(),
    {
      id: "actions",
      cell: ({ row }) => (
        <PendingListingRowActions
          listing={row.original}
          pageType="rent"
        />
      ),
    },
  ];
}
