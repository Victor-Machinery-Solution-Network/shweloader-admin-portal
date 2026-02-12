"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removeFromFeatured } from "@/lib/actions/listing";
import type { FeaturedListingWithDetails } from "@/types/listing";

function RemoveButton({ featuredId }: { featuredId: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
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
      <X className="size-4 text-destructive" aria-hidden="true" />
    </Button>
  );
}

export const featuredColumns: ColumnDef<FeaturedListingWithDetails>[] = [
  {
    id: "thumbnail",
    header: "",
    cell: ({ row }) => {
      const url = row.original.thumbnail_url;
      return url ? (
        <img
          src={url}
          alt=""
          className="size-10 rounded-md object-cover"
        />
      ) : (
        <div className="bg-muted size-10 rounded-md" />
      );
    },
    size: 50,
  },
  {
    accessorKey: "model_name",
    header: "Model",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.model_name ?? "—"}
      </span>
    ),
  },
  {
    id: "listing_type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs capitalize">
        {row.original.listing_type === "sale" ? "For Sale" : "For Rent"}
      </Badge>
    ),
  },
  {
    accessorKey: "partner_name",
    header: "Partner",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.partner_name ?? "—"}
      </span>
    ),
  },
  {
    id: "remove",
    header: "",
    cell: ({ row }) => <RemoveButton featuredId={row.original.id} />,
    size: 40,
  },
];
