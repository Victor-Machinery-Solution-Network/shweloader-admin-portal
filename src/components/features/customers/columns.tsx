"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/types/customer";
import type { BusinessType } from "@/types/customer";

export function createColumns(
  businessTypes: BusinessType[],
): ColumnDef<Customer>[] {
  const businessTypeMap = new Map(
    businessTypes.map((bt) => [bt.business_type_id, bt.name]),
  );

  return [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Username" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("username")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue("email")}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string | null;
        return phone ? (
          <span className="text-sm">{phone}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "company_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const company = row.getValue("company_name") as string | null;
        return company ? (
          <span className="text-sm">{company}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      id: "business_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Business Type" />
      ),
      cell: ({ row }) => {
        if (!row.original.business_type_id) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        const name =
          businessTypeMap.get(row.original.business_type_id) ??
          `#${row.original.business_type_id}`;
        return (
          <Badge variant="secondary" className="text-xs">
            {name}
          </Badge>
        );
      },
    },
    {
      id: "verified",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Verified" />
      ),
      cell: ({ row }) => {
        const verified = row.original.is_verified === 1;
        return (
          <Badge
            variant={verified ? "default" : "outline"}
            className="text-xs"
          >
            {verified ? "Verified" : "Unverified"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-muted-foreground text-sm">
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
    },
  ];
}
