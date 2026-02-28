"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { Users, Briefcase, Plus, Ban, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createColumns } from "./columns";
import { UserDetailDialog } from "./user-detail-dialog";
import { blacklistColumns } from "./blacklist-columns";
import { BlacklistConfirmDialog } from "./blacklist-confirm-dialog";
import { UnblacklistDialog } from "./unblacklist-dialog";
import { BlacklistSearchDialog } from "./blacklist-search-dialog";
import { columns as businessTypeColumns } from "@/components/features/business-types/columns";
import { BusinessTypeForm } from "@/components/features/business-types/business-type-form";
import {
  deleteBusinessTypes,
  getUserCount,
} from "@/lib/actions/business-type";
import { unblacklistUsers } from "@/lib/actions/blacklist";
import type { AppUser, BusinessType } from "@/types/app-user";
import type { BlacklistEntryWithDetails } from "@/types/blacklist";

interface UsersClientProps {
  users: AppUser[];
  businessTypes: BusinessType[];
  listedBusinessTypes: BusinessType[];
  blacklistEntries: BlacklistEntryWithDetails[];
}

export function UsersClient({
  users = [],
  businessTypes = [],
  listedBusinessTypes = [],
  blacklistEntries = [],
}: UsersClientProps) {
  // Permissions
  const canCreateBT = useHasPermission("business_types", "create");
  const canDeleteBT = useHasPermission("business_types", "delete");
  const canCreateBlacklist = useHasPermission("blacklist", "create");
  const canDeleteBlacklist = useHasPermission("blacklist", "delete");

  // Business type dialog
  const [showCreateBT, setShowCreateBT] = useState(false);

  // User detail dialog
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Blacklist dialogs
  const [blacklistTarget, setBlacklistTarget] = useState<AppUser | null>(null);
  const [showBlacklistSearch, setShowBlacklistSearch] = useState(false);
  const [showUnblacklist, setShowUnblacklist] = useState(false);
  const [selectedForUnblacklist, setSelectedForUnblacklist] = useState<
    BlacklistEntryWithDetails[]
  >([]);
  const [isUnblacklisting, startUnblacklistTransition] = useTransition();

  // Memos
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

  // Business type handlers
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

  // Blacklist handlers
  const handleBlacklistFromDetail = useCallback((user: AppUser) => {
    setSelectedUser(null);
    setBlacklistTarget(user);
  }, []);

  const handleUnblacklist = useCallback(() => {
    if (selectedForUnblacklist.length === 0) return;
    startUnblacklistTransition(async () => {
      const ids = selectedForUnblacklist.map((e) => e.blacklist_id);
      const result = await unblacklistUsers(ids);
      if (result.success) {
        toast.success(
          `${selectedForUnblacklist.length} ${selectedForUnblacklist.length === 1 ? "entry" : "entries"} unblacklisted`,
        );
        setShowUnblacklist(false);
        setSelectedForUnblacklist([]);
      } else {
        toast.error(result.error ?? "Failed to unblacklist");
      }
    });
  }, [selectedForUnblacklist]);

  const renderBlacklistToolbar = useCallback(
    (selected: BlacklistEntryWithDetails[]) => (
      <>
        {canDeleteBlacklist && selected.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedForUnblacklist(selected);
              setShowUnblacklist(true);
            }}
          >
            <ShieldOff className="size-4" />
            Unblacklist ({selected.length})
          </Button>
        )}
        {canCreateBlacklist && (
          <Button
            onClick={() => setShowBlacklistSearch(true)}
            className="ml-auto"
          >
            <Plus /> Add to Blacklist
          </Button>
        )}
      </>
    ),
    [canCreateBlacklist, canDeleteBlacklist],
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
          <TabsTrigger value="blacklist">
            <Ban className="size-4" />
            Blacklist
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

        <TabsContent value="blacklist">
          {blacklistEntries.length > 0 ? (
            <DataTable
              columns={blacklistColumns}
              data={blacklistEntries}
              searchKeys={["username", "phone", "email", "company_name"]}
              searchPlaceholder="Search blacklist"
              enableSelection
              enablePagination
              pageSize={10}
              getRowId={(row) => row.blacklist_id}
              toolbar={renderBlacklistToolbar}
            />
          ) : (
            <EmptyState
              icon={Ban}
              title="No blacklisted users"
              description="Blacklisted users will appear here."
              fullPage={false}
              action={
                canCreateBlacklist ? (
                  <Button onClick={() => setShowBlacklistSearch(true)}>
                    <Plus /> Add to Blacklist
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {/* User detail dialog */}
      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onBlacklist={handleBlacklistFromDetail}
        businessTypeMap={businessTypeMap}
      />

      {/* Business type form */}
      <BusinessTypeForm open={showCreateBT} onOpenChange={setShowCreateBT} />

      {/* Blacklist confirmation (impact preview) */}
      <BlacklistConfirmDialog
        user={blacklistTarget}
        onClose={() => setBlacklistTarget(null)}
      />

      {/* Blacklist search dialog */}
      <BlacklistSearchDialog
        open={showBlacklistSearch}
        onOpenChange={setShowBlacklistSearch}
        onSelectUser={(user) => setBlacklistTarget(user)}
      />

      {/* Unblacklist dialog */}
      <UnblacklistDialog
        open={showUnblacklist}
        onOpenChange={setShowUnblacklist}
        onConfirm={handleUnblacklist}
        count={selectedForUnblacklist.length}
        isPending={isUnblacklisting}
      />
    </>
  );
}
