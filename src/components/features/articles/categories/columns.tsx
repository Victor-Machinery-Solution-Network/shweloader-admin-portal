"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { ArticleCategory } from "@/types/article";
import { RowActions } from "./row-actions";

export const columns: ColumnDef<ArticleCategory>[] = [
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
    cell: ({ row }) => <RowActions category={row.original} />,
  },
];
