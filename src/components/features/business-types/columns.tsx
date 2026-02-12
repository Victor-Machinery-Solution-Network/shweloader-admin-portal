"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { BusinessType } from "@/types/customer";

export const columns: ColumnDef<BusinessType>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
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
    cell: ({ row }) => <RowActions businessType={row.original} />,
  },
];
