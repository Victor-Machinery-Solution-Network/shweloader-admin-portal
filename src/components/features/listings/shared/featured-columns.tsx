"use client";

import Image from "next/image";
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
import type { FeaturedListingWithDetails } from "@/types/listing";

function RemoveButton({ featuredId }: { featuredId: number }) {
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
          const result = await removeFromFeatured(featuredId);
          if (result.success) {
            toast.success("Removed from featured");
          } else {
            toast.error(result.error ?? "Failed to remove");
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
          {src ? (
            <div className="size-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image src={src} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="size-10 shrink-0 rounded-lg border bg-muted" />
          )}
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
    accessorFn: (row) => row.listing_type === "sale" ? "For Sale" : "For Rent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listing" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.original.listing_type === "sale" ? "For Sale" : "For Rent"}
      </Badge>
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
    cell: ({ row }) => <RemoveButton featuredId={row.original.id} />,
    size: 40,
  },
];
