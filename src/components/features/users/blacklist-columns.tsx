"use client";

import { Ban, Building2, Phone } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { BlacklistEntryWithDetails } from "@/types/blacklist";

export const blacklistColumns: ColumnDef<BlacklistEntryWithDetails>[] = [
  {
    accessorKey: "username",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-500/10">
          <Ban className="size-3.5 text-red-500" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">
            {row.original.username}
          </span>
          <span className="text-muted-foreground text-xs truncate">
            {row.original.email}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm">
        <Phone className="size-3.5 text-muted-foreground shrink-0" />
        <span className="tabular-nums">{row.original.phone ?? "—"}</span>
      </div>
    ),
  },
  {
    accessorKey: "company_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) =>
      row.original.company_name ? (
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate max-w-40">
            {row.original.company_name}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  },
  {
    accessorKey: "reason",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
    cell: ({ row }) => (
      <span className="text-sm max-w-48 truncate block">
        {row.original.reason}
      </span>
    ),
  },
  {
    id: "blacklisted_info",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Blacklisted" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col text-sm">
        <span>{row.original.admin_username}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      </div>
    ),
  },
];
