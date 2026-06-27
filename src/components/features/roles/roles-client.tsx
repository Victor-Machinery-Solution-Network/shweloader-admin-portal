"use client";

import { useState, useCallback, useMemo } from "react";
import { Shield, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { RoleForm } from "./role-form";
import { createColumns } from "./columns";
import { deleteRoles } from "@/lib/actions/role";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/constants";
import type {
  RoleWithPermissionCount,
  FeaturePermission,
} from "@/types/role";

interface RolesClientProps {
  roles: RoleWithPermissionCount[];
  featurePermissions: FeaturePermission[];
  adminCounts: Record<number, number>;
  rolePermissionMap: Record<number, number[]>;
}

export function RolesClient({
  roles,
  featurePermissions,
  adminCounts,
  rolePermissionMap,
}: RolesClientProps) {
  const canCreate = useHasPermission("roles", "create");
  const canExport = useHasPermission("roles", "export");
  const canDelete = useHasPermission("roles", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(featurePermissions, adminCounts, rolePermissionMap),
    [featurePermissions, adminCounts, rolePermissionMap],
  );

  const filterConfig = useMemo<FilterConfig[]>(
    () => [{ columnId: "created_at", label: "Created At", type: "date-range" }],
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: RoleWithPermissionCount[]) => {
      const ids = selected.map((r) => r.role_id);
      return deleteRoles(ids);
    },
    [],
  );

  const buildDescription = useCallback(
    async (selected: RoleWithPermissionCount[]) => {
      const hasSystemRole = selected.some((r) => r.role_id === SUPER_ADMIN_ROLE_ID);
      if (hasSystemRole) {
        return "Selection includes the Super Admin role which cannot be deleted. It will be skipped.";
      }
      const count = selected.length;
      const plural = count === 1 ? "role" : "roles";
      return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: RoleWithPermissionCount[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="role"
          />
        )}
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="ml-auto">
            <Plus /> Add Role
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {roles.length > 0 ? (
        <DataTable
          columns={columns}
          data={roles}
          searchKeys={["name", "description"]}
          searchPlaceholder="Search roles"
          filterConfig={filterConfig}
          filterStorageKey="roles-filters"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.role_id}
          toolbar={renderToolbar}
          enableExport={canExport}
          exportFileName="roles"
        />
      ) : (
        <EmptyState
          icon={Shield}
          title="No roles yet"
          description="Get started by creating your first role."
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus /> Add Role
              </Button>
            ) : undefined
          }
        />
      )}

      <RoleForm
        open={showCreate}
        onOpenChange={setShowCreate}
        featurePermissions={featurePermissions}
      />
    </>
  );
}
