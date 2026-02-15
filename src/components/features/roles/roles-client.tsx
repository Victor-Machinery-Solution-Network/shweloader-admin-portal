"use client";

import { useState, useCallback, useMemo } from "react";
import { Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { RoleForm } from "./role-form";
import { createColumns } from "./columns";
import { deleteRoles } from "@/lib/actions/role";
import type {
  RoleWithPermissionCount,
  FeaturePermission,
} from "@/types/role";

interface RolesClientProps {
  roles: RoleWithPermissionCount[];
  featurePermissions: FeaturePermission[];
  adminCounts: Record<number, number>;
}

export function RolesClient({
  roles,
  featurePermissions,
  adminCounts,
}: RolesClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(featurePermissions, adminCounts),
    [featurePermissions, adminCounts],
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
      const hasSuperAdmin = selected.some((r) => r.name === "Super Admin");
      if (hasSuperAdmin) {
        return "Selection includes the Super Admin role which cannot be deleted. It will be skipped.";
      }
      const count = selected.length;
      const plural = count === 1 ? "role" : "roles";
      return `This will permanently delete ${count} ${plural}. This action cannot be undone.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: RoleWithPermissionCount[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="role"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Role
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      {roles.length > 0 ? (
        <DataTable
          columns={columns}
          data={roles}
          searchKey="name"
          searchPlaceholder="Search roles"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.role_id}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Shield}
          title="No roles yet"
          description="Get started by creating your first role."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Role
            </Button>
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
