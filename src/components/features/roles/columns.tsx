"use client";

import { Shield, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { RoleRowActions } from "./row-actions";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/constants";
import type {
  RoleWithPermissionCount,
  FeaturePermission,
} from "@/types/role";

export function createColumns(
  featurePermissions: FeaturePermission[],
  adminCounts: Record<number, number>,
  rolePermissionMap: Record<number, number[]>,
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
        const isSuperAdmin = row.original.role_id === SUPER_ADMIN_ROLE_ID;
        return (
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                isSuperAdmin ? "bg-amber-500/10" : "bg-violet-500/10",
              )}
            >
              <Shield
                className={cn(
                  "size-3.5",
                  isSuperAdmin ? "text-amber-500" : "text-violet-500",
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{name}</span>
              {isSuperAdmin && (
                <Badge variant="secondary" className="text-xs">System</Badge>
              )}
            </div>
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
        const pct = totalPermissions > 0 ? Math.round((count / totalPermissions) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {count}/{totalPermissions}
            </span>
          </div>
        );
      },
    },
    {
      id: "admin_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      accessorFn: (row) => adminCounts[row.role_id] ?? 0,
      cell: ({ row }) => {
        const count = adminCounts[row.original.role_id] ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
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
        <RoleRowActions
          role={row.original}
          featurePermissions={featurePermissions}
          adminCount={adminCounts[row.original.role_id] ?? 0}
          rolePermissionIds={rolePermissionMap[row.original.role_id] ?? []}
        />
      ),
    },
  ];
}
