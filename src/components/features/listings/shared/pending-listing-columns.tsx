"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
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

function thumbnailColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "thumbnail",
    header: "",
    cell: ({ row }) => {
      const url = row.original.thumbnail_url;
      return url ? (
        <div className="size-11 shrink-0 overflow-hidden rounded-lg border bg-muted">
          <img src={url} alt="" className="size-full object-cover" />
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
          <span className="text-muted-foreground text-sm">{"\u2014"}</span>
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

// --- Pending Sale Columns ---

export function createPendingSaleColumns(): ColumnDef<SaleListingWithDetails>[] {
  return [
    thumbnailColumn<SaleListingWithDetails>(),
    modelColumn<SaleListingWithDetails>(),
    partnerColumn<SaleListingWithDetails>(),
    productTypeColumn<SaleListingWithDetails>(),
    priceColumn<SaleListingWithDetails>(),
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
    thumbnailColumn<RentListingWithDetails>(),
    modelColumn<RentListingWithDetails>(),
    partnerColumn<RentListingWithDetails>(),
    productTypeColumn<RentListingWithDetails>(),
    priceColumn<RentListingWithDetails>(),
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
