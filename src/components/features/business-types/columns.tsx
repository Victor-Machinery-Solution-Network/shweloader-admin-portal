"use client";

import { Briefcase } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { BusinessType } from "@/types/app-user";

export const columns: ColumnDef<BusinessType>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
          <Briefcase className="size-3.5 text-amber-500" />
        </div>
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
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
