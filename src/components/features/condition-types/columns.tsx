"use client";

import { ListChecks } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { RowActions } from "./row-actions";
import type { ConditionType } from "@/types/listing";

export const columns: ColumnDef<ConditionType>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
          <ListChecks className="size-3.5 text-emerald-500" />
        </div>
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions conditionType={row.original} />,
  },
];
