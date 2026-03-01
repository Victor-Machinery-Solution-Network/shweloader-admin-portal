"use client";

import { Box } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { ImageCell } from "@/components/shared/image-cell";
import { formatDate } from "@/lib/utils";
import type { AttachmentCategory } from "@/types/attachment";
import { RowActions } from "./row-actions";

export function getColumns(
  linkedInfo: Record<number, { total: number; summary: string }>,
): ColumnDef<AttachmentCategory>[] {
  return [
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
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <ImageCell
          name={row.getValue("name") as string}
          imageUrl={row.original.image_url}
        />
      ),
    },
    {
      id: "models",
      accessorFn: (row) => linkedInfo[row.category_id]?.total ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Models" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("models") as number;
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            <Box className="size-3.5" />
            {count}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatDate(date)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const info = linkedInfo[row.original.category_id];
        return (
          <RowActions
            category={row.original}
            linkedCount={info?.total ?? 0}
            linkedSummary={info?.summary ?? ""}
          />
        );
      },
    },
  ];
}
