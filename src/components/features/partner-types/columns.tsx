"use client";

import { Handshake } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { RowActions } from "./row-actions";
import type { PartnerType } from "@/types/partner";

export type PartnerTypeRow = Pick<PartnerType, "id" | "name" | "name_my">;

export const columns: ColumnDef<PartnerTypeRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
          <Handshake className="size-3.5 text-violet-500" />
        </div>
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    accessorKey: "name_my",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Burmese Name" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {(row.getValue("name_my") as string | null) || "—"}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions partnerType={row.original} />,
  },
];
