"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { Location } from "@/types/location";
import { RowActions } from "./row-actions";

export function getColumns(
  linkedCounts: Record<number, number>,
): ColumnDef<Location>[] {
  return [
    {
      accessorKey: "city_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="City Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("city_name")}</span>
      ),
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
      cell: ({ row }) => (
        <RowActions
          location={row.original}
          linkedCount={linkedCounts[row.original.location_id] ?? 0}
        />
      ),
    },
  ];
}
