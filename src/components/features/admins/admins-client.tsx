"use client";

import { useState, useCallback, useMemo } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(() => createColumns(roles), [roles]);

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
      return `This will permanently delete ${count} ${plural}. This action cannot be undone.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: AdminWithRole[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="admin"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Admin
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      {admins.length > 0 ? (
        <DataTable
          columns={columns}
          data={admins}
          searchKey="username"
          searchPlaceholder="Search admins"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.user_id}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No admins yet"
          description="Get started by creating your first admin account."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Admin
            </Button>
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
