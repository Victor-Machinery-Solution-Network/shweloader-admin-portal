"use client";


import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { assetUrl } from "@/lib/r2-url";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { removeFromFeatured } from "@/lib/actions/listing";
import { ListingThumbnail } from "./listing-thumbnail";
import type { FeaturedListingWithDetails } from "@/types/listing";

function RemoveButton({ featuredIds }: { featuredIds: number[] }) {
  const canEdit = useHasPermission("featured_listings", "edit");
  const [isPending, startTransition] = useTransition();

  if (!canEdit) return null;

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Remove from featured"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          // Remove all featured entries for this product
          const results = await Promise.all(
            featuredIds.map((id) => removeFromFeatured(id)),
          );
          const failed = results.find((r) => !r.success);
          if (failed) {
            toast.error(failed.error ?? "Failed to remove");
          } else {
            toast.success("Removed from featured");
          }
        });
      }}
    >
      <X className="size-4" aria-hidden="true" />
    </Button>
  );
}

export const featuredColumns: ColumnDef<FeaturedListingWithDetails>[] = [
  {
    id: "index",
    header: () => <span className="block text-center">#</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground block text-center text-sm tabular-nums">
        {row.index + 1}
      </span>
    ),
    size: 36,
    minSize: 36,
    maxSize: 36,
  },
  {
    accessorKey: "model_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => {
      const src = assetUrl(row.original.thumbnail_url);
      return (
        <div className="flex items-center gap-3">
          <ListingThumbnail src={src} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.model_name ?? "\u2014"}</p>
            {row.original.custom_id && (
              <p className="truncate text-xs text-muted-foreground font-mono">{row.original.custom_id}</p>
            )}
          </div>
        </div>
      );
    },
    minSize: 200,
  },
  {
    accessorKey: "partner_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.partner_name ?? "\u2014"}
      </span>
    ),
  },
  {
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
  },
  {
    id: "listing_type",
    accessorFn: (row) => row.listing_types.map((t) => t === "sale" ? "For Sale" : "For Rent").join(", "),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listing" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        {row.original.listing_types.map((type) => (
          <Badge key={type} variant={type === "sale" ? "equipment" : "attachment"} className="text-xs">
            {type === "sale" ? "For Sale" : "For Rent"}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "approved_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listed" />
    ),
    cell: ({ row }) => {
      const date = row.original.approved_at;
      return (
        <span className="text-muted-foreground text-sm tabular-nums">
          {date ? formatDate(date) : "\u2014"}
        </span>
      );
    },
  },
  {
    id: "remove",
    header: "",
    cell: ({ row }) => <RemoveButton featuredIds={row.original.featured_ids} />,
    size: 40,
  },
];
