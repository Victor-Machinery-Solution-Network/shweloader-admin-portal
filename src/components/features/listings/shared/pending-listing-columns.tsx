"use client";

import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { assetUrl } from "@/lib/r2-url";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { PendingListingRowActions } from "./pending-listing-row-actions";
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
};

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
          {src ? (
            <div className="size-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image src={src} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="size-10 shrink-0 rounded-lg border bg-muted" />
          )}
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
      const { mmk_price, usd_price } = row.original;
      const hasMmk = mmk_price != null;
      const hasUsd = usd_price != null;

      if (!hasMmk && !hasUsd) {
        return <span className="text-muted-foreground">{"\u2014"}</span>;
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
              ${Number(usd_price).toLocaleString()}
            </p>
          )}
        </div>
      );
    },
  };
}

function statusColumn<T extends { approve_status_name: string | null }>(): ColumnDef<T> {
  return {
    id: "status",
    accessorFn: (row) => row.approve_status_name ?? "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.approve_status_name;
      const isRework = status === "Rework";
      return (
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "size-2 rounded-full",
              isRework ? "bg-amber-500" : "bg-blue-500",
            )}
          />
          <span className="text-sm">{status ?? "—"}</span>
        </div>
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
    statusColumn<SaleListingWithDetails>(),
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Submitted" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
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
    statusColumn<RentListingWithDetails>(),
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Submitted" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
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
