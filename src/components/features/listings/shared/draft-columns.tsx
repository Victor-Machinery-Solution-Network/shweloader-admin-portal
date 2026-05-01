"use client";


import type { ColumnDef } from "@tanstack/react-table";
import { assetUrl } from "@/lib/r2-url";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DraftRowActions } from "./draft-row-actions";
import { ListingThumbnail } from "./listing-thumbnail";
import type { DraftListingWithDetails } from "@/types/listing";

export function createDraftColumns(): ColumnDef<DraftListingWithDetails>[] {
  return [
    {
      accessorKey: "model_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      cell: ({ row }) => {
        const src = assetUrl(row.original.thumbnail_url);
        const name = row.original.model_name;
        return (
          <div className="flex items-center gap-3">
            <ListingThumbnail src={src} />
            <span className="truncate text-sm font-medium">
              {name ?? "Untitled Draft"}
            </span>
          </div>
        );
      },
      minSize: 200,
    },
    {
      id: "product_type",
      accessorFn: (row) => row.product_type ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.product_type;
        if (!type) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <Badge
            variant={type === "equipment" ? "equipment" : "attachment"}
            className="text-xs capitalize"
          >
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "partner_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Partner" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.partner_name ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Saved" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <DraftRowActions draft={row.original} />,
    },
  ];
}
