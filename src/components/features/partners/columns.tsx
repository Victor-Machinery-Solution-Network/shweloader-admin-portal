"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "./row-actions";
import type { PartnerWithDetails } from "@/types/partner";

function getStatusVariant(
  status: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status?.toLowerCase()) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
}

export const columns: ColumnDef<PartnerWithDetails>[] = [
  {
    accessorKey: "customer_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => {
      const name = row.original.customer_name;
      const email = row.original.customer_email;
      return (
        <div>
          <span className="font-medium">{name ?? "—"}</span>
          {email && (
            <p className="text-muted-foreground text-xs">{email}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "customer_company",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => {
      const company = row.original.customer_company;
      return company ? (
        <span className="text-sm">{company}</span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "partner_type_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.partner_type_name;
      return type ? (
        <Badge variant="secondary" className="text-xs">
          {type}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    id: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status_name;
      return (
        <Badge variant={getStatusVariant(status)} className="text-xs">
          {status ?? "Unknown"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "applied_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Applied" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("applied_at") as string;
      return (
        <span className="text-muted-foreground text-sm">
          {new Date(date).toLocaleDateString()}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions partner={row.original} />,
  },
];
