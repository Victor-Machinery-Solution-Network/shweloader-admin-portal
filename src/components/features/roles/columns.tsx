"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { RoleRowActions } from "./row-actions";
import type {
  RoleWithPermissionCount,
  FeaturePermission,
} from "@/types/role";

export function createColumns(
  featurePermissions: FeaturePermission[],
  adminCounts: Record<number, number>,
): ColumnDef<RoleWithPermissionCount>[] {
  const totalPermissions = featurePermissions.length;

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            {name === "Super Admin" && (
              <Badge variant="secondary">System</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const desc = row.getValue("description") as string | null;
        return desc ? (
          <span className="text-sm">{desc}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "permission_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Permissions" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("permission_count") as number;
        return (
          <Badge variant="outline">
            {count} / {totalPermissions}
          </Badge>
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
        <RoleRowActions
          role={row.original}
          featurePermissions={featurePermissions}
          adminCount={adminCounts[row.original.role_id] ?? 0}
        />
      ),
    },
  ];
}
