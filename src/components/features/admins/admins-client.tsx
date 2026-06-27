"use client";

import { useState, useCallback, useMemo } from "react";
import { Users, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { AdminForm } from "./admin-form";
import { createColumns } from "./columns";
import { deleteAdmins } from "@/lib/actions/admin";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

interface AdminsClientProps {
  admins: AdminWithRole[];
  roles: Role[];
}

export function AdminsClient({ admins, roles }: AdminsClientProps) {
  const canCreate = useHasPermission("admin_users", "create");
  const canExport = useHasPermission("admin_users", "export");
  const canDelete = useHasPermission("admin_users", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(() => createColumns(roles), [roles]);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "role_name",
        label: "Role",
        type: "multi-select",
        options: roles.map((r) => ({ label: r.name, value: r.name })),
      },
      {
        columnId: "active",
        label: "Status",
        type: "boolean",
        trueLabel: "Active",
        falseLabel: "Inactive",
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [roles],
  );

  const handleBulkDelete = useCallback(
    async (selected: AdminWithRole[]) => {
      const ids = selected.map((a) => a.user_id);
      return deleteAdmins(ids);
    },
    [],
  );

  const buildDescription = useCallback(
    async (selected: AdminWithRole[]) => {
      const hasPrimary = selected.some((a) => a.user_id === 1);
      if (hasPrimary) {
        return "Selection includes the primary admin which cannot be deleted. It will be skipped.";
      }
      const count = selected.length;
      const plural = count === 1 ? "admin" : "admins";
      return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: AdminWithRole[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="admin"
          />
        )}
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="ml-auto">
            <Plus /> Add Admin
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {admins.length > 0 ? (
        <DataTable
          columns={columns}
          data={admins}
          searchKeys={["username", "email"]}
          searchPlaceholder="Search admins"
          filterConfig={filterConfig}
          filterStorageKey="admins-filters"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.user_id}
          toolbar={renderToolbar}
          enableExport={canExport}
          exportFileName="admins"
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No admins yet"
          description="Get started by creating your first admin account."
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus /> Add Admin
              </Button>
            ) : undefined
          }
        />
      )}

      <AdminForm
        open={showCreate}
        onOpenChange={setShowCreate}
        roles={roles}
      />
    </>
  );
}
