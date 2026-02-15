"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { toggleAdminActive } from "@/lib/actions/admin";
import { AdminRowActions } from "./row-actions";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

function ActiveToggle({ admin }: { admin: AdminWithRole }) {
  const [isPending, startTransition] = useTransition();
  const isActive = admin.active === 1;
  const isPrimaryAdmin = admin.user_id === 1;

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
    <Button
      variant={isActive ? "outline" : "ghost"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending || isPrimaryAdmin}
      className="gap-1.5"
    >
      {isActive ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <Circle className="size-4" />
      )}
      {isActive ? "Active" : "Inactive"}
    </Button>
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
        const isPrimaryAdmin = row.original.user_id === 1;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.username}</span>
            {isPrimaryAdmin && (
              <Badge variant="secondary">Primary</Badge>
            )}
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
        <span className="text-sm">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const roleName = row.original.role_name;
        return roleName ? (
          <Badge variant="outline">{roleName}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "active",
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
