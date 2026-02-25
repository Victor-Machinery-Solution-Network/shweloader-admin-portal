"use client";

import { FolderOpen, FileText } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { ArticleCategory } from "@/types/article";
import { RowActions } from "./row-actions";

export function getColumns(
  linkedCounts: Record<number, number>,
): ColumnDef<ArticleCategory>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/10">
            <FolderOpen className="size-3.5 text-cyan-500" />
          </div>
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      id: "articles",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Articles" />
      ),
      accessorFn: (row) => linkedCounts[row.category_id] ?? 0,
      cell: ({ row }) => {
        const count = linkedCounts[row.original.category_id] ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="text-sm tabular-nums">{count}</span>
          </div>
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
      cell: ({ row }) => (
        <RowActions
          category={row.original}
          linkedCount={linkedCounts[row.original.category_id] ?? 0}
        />
      ),
    },
  ];
}
