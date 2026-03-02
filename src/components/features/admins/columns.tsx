"use client";

import { useTransition } from "react";
import { UserRound, Shield, Mail } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate } from "@/lib/utils";
import { toggleAdminActive } from "@/lib/actions/admin";
import { PRIMARY_ADMIN_ID, SUPER_ADMIN_ROLE_ID } from "@/lib/constants";
import { AdminRowActions } from "./row-actions";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

function ActiveToggle({ admin }: { admin: AdminWithRole }) {
  const [isPending, startTransition] = useTransition();
  const isActive = admin.active === 1;
  const isPrimaryAdmin = admin.user_id === PRIMARY_ADMIN_ID;

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAdminActive(admin.user_id);
      if (result.success) {
        toast.success(
          isActive ? "Admin deactivated" : "Admin activated",
        );
      } else {
        toast.error(result.error ?? "Failed to update status");
      }
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "size-2 rounded-full",
            isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "text-sm",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <Switch
        size="sm"
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending || isPrimaryAdmin}
      />
    </div>
  );
}

export function createColumns(
  roles: Role[],
): ColumnDef<AdminWithRole>[] {
  return [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const isPrimaryAdmin = row.original.user_id === PRIMARY_ADMIN_ID;
        return (
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                isPrimaryAdmin ? "bg-amber-500/10" : "bg-blue-500/10",
              )}
            >
              <UserRound
                className={cn(
                  "size-3.5",
                  isPrimaryAdmin ? "text-amber-500" : "text-blue-500",
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.username}</span>
              {isPrimaryAdmin && (
                <Badge variant="secondary" className="text-xs">Primary</Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Mail className="size-3.5 text-muted-foreground" />
          <span className="text-sm">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const roleName = row.original.role_name;
        const isSuperAdmin = row.original.role_id === SUPER_ADMIN_ROLE_ID;
        return roleName ? (
          <Badge variant={isSuperAdmin ? "warning" : "outline"}>
            <Shield className="size-3" />
            {roleName}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "active",
      accessorFn: (row) => row.active,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <ActiveToggle admin={row.original} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <AdminRowActions admin={row.original} roles={roles} />
      ),
    },
  ];
}
