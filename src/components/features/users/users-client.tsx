"use client";

import { useState, useMemo, useCallback } from "react";
import { Users, Briefcase, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createColumns } from "./columns";
import { UserDetailDialog } from "./user-detail-dialog";
import { columns as businessTypeColumns } from "@/components/features/business-types/columns";
import { BusinessTypeForm } from "@/components/features/business-types/business-type-form";
import {
  deleteBusinessTypes,
  getUserCount,
} from "@/lib/actions/business-type";
import type { AppUser, BusinessType } from "@/types/app-user";

interface UsersClientProps {
  users: AppUser[];
  businessTypes: BusinessType[];
  listedBusinessTypes: BusinessType[];
}

export function UsersClient({
  users = [],
  businessTypes = [],
  listedBusinessTypes = [],
}: UsersClientProps) {
  const canCreateBT = useHasPermission("business_types", "create");
  const canDeleteBT = useHasPermission("business_types", "delete");
  const [showCreateBT, setShowCreateBT] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(
    null,
  );

  const businessTypeMap = useMemo(
    () =>
      new Map(
        businessTypes.map((bt) => [
          bt.business_type_id,
          { name: bt.name, isListed: bt.is_listed === 1 },
        ]),
      ),
    [businessTypes],
  );

  const handleViewUser = useCallback((user: AppUser) => {
    setSelectedUser(user);
  }, []);

  const userColumns = useMemo(
    () => createColumns(businessTypeMap, handleViewUser),
    [businessTypeMap, handleViewUser],
  );

  const userFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "is_verified",
        label: "Verification",
        type: "boolean",
        trueLabel: "Verified",
        falseLabel: "Unverified",
      },
      {
        columnId: "business_type",
        label: "Business Type",
        type: "multi-select",
        options: businessTypes.map((bt) => ({
          label: bt.name,
          value: bt.name,
        })),
      },
      {
        columnId: "is_approved_partner",
        label: "Partner",
        type: "boolean",
        trueLabel: "Partner",
        falseLabel: "Non-partner",
      },
      { columnId: "created_at", label: "Joined", type: "date-range" },
    ],
    [businessTypes],
  );

  const buildBTDescription = useCallback(async (selected: BusinessType[]) => {
    const ids = selected.map((bt) => bt.business_type_id);
    const counts = await getUserCount(ids);
    const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

    const names = selected.map((bt) => `"${bt.name}"`).join(", ");
    let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} business types (${names})`}.`;

    if (totalLinked > 0) {
      msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "user" : "users"} using ${selected.length === 1 ? "this business type" : "these business types"}.`;
    }

    return msg;
  }, []);

  const handleBulkDeleteBT = useCallback(async (selected: BusinessType[]) => {
    const ids = selected.map((bt) => bt.business_type_id);
    return deleteBusinessTypes(ids);
  }, []);

  const renderBTToolbar = useCallback(
    (selected: BusinessType[]) => (
      <>
        {canDeleteBT && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDeleteBT}
            buildDescription={buildBTDescription}
            itemLabel="business type"
          />
        )}
        {canCreateBT && (
          <Button onClick={() => setShowCreateBT(true)} className="ml-auto">
            <Plus /> Add Business Type
          </Button>
        )}
      </>
    ),
    [handleBulkDeleteBT, buildBTDescription, canCreateBT, canDeleteBT],
  );

  return (
    <>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="size-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="business-types">
            <Briefcase className="size-4" />
            Business Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {users.length > 0 ? (
            <DataTable
              columns={userColumns}
              data={users}
              searchKeys={["username", "email", "phone", "company_name"]}
              searchPlaceholder="Search users"
              filterConfig={userFilterConfig}
              filterStorageKey="users-filters"
              initialColumnVisibility={{ is_approved_partner: false }}
              enablePagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No users yet"
              description="Users will appear here once they register on the website."
              fullPage={false}
            />
          )}
        </TabsContent>

        <TabsContent value="business-types">
          {businessTypes.length > 0 ? (
            <DataTable
              columns={businessTypeColumns}
              data={listedBusinessTypes}
              searchKeys={["name"]}
              searchPlaceholder="Search business types"
              enableSelection
              enablePagination
              pageSize={10}
              getRowId={(row) => row.business_type_id}
              toolbar={renderBTToolbar}
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No business types yet"
              description="Get started by creating your first business type."
              fullPage={false}
              action={
                canCreateBT ? (
                  <Button onClick={() => setShowCreateBT(true)}>
                    <Plus /> Add Business Type
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        businessTypeMap={businessTypeMap}
      />

      <BusinessTypeForm open={showCreateBT} onOpenChange={setShowCreateBT} />
    </>
  );
}
