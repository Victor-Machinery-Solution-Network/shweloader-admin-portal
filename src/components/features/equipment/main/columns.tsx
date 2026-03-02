"use client";

import { FolderOpen } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { ImageCell } from "@/components/shared/image-cell";
import { formatDate } from "@/lib/utils";
import type { EquipmentMainCategory } from "@/types/equipment";
import { RowActions } from "./row-actions";

export function getColumns(
  linkedCounts: Record<number, number>,
): ColumnDef<EquipmentMainCategory>[] {
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
      id: "sub_categories",
      accessorFn: (row) => linkedCounts[row.category_id] ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sub Categories" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("sub_categories") as number;
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            <FolderOpen className="size-3.5" />
            {count}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
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
      cell: ({ row }) => (
        <RowActions
          category={row.original}
          linkedCount={linkedCounts[row.original.category_id] ?? 0}
        />
      ),
    },
  ];
}
