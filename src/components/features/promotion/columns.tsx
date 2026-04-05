"use client";

import { Send } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { PromotionPush } from "@/types/promotion";

export const columns: ColumnDef<PromotionPush>[] = [
  {
    id: "index",
    header: () => <span className="block text-center">No.</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground block text-center text-sm tabular-nums">
        {row.index + 1}
      </span>
    ),
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
          <Send className="size-3.5 text-blue-500" />
        </div>
        <span className="font-medium line-clamp-1 max-w-md">
          {row.original.title}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "body",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Message" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm line-clamp-1 max-w-sm">
        {row.original.body}
      </span>
    ),
  },
  {
    accessorKey: "device_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Devices" />
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.device_count.toLocaleString()}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "listing_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {row.original.listing_id ? `#${row.original.listing_id}` : "—"}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sent At" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions promotion={row.original} />,
  },
];
