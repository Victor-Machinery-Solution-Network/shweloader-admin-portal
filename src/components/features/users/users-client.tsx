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
import { UserForm } from "./user-form";
import { UserEditForm } from "./user-edit-form";
import { PasswordRevealDialog } from "./password-reveal-dialog";
import { columns as businessTypeColumns } from "@/components/features/business-types/columns";
import { BusinessTypeForm } from "@/components/features/business-types/business-type-form";
import {
  deleteBusinessTypes,
  getUserCount,
} from "@/lib/actions/business-type";
import { unblacklistUsers } from "@/lib/actions/blacklist";
import type { AppUser, BusinessType } from "@/types/app-user";
import type { BlacklistEntryWithDetails } from "@/types/blacklist";
import type { StateRegion, District, Township } from "@/types/location";

interface UsersClientProps {
  users: AppUser[];
  businessTypes: BusinessType[];
  listedBusinessTypes: BusinessType[];
  blacklistEntries: BlacklistEntryWithDetails[];
  stateRegions: StateRegion[];
  districts: District[];
  townships: Township[];
  partnerTypes: { id: number; name: string }[];
}

export function UsersClient({
  users = [],
  businessTypes = [],
  listedBusinessTypes = [],
  blacklistEntries = [],
  stateRegions = [],
  districts = [],
  townships = [],
  partnerTypes = [],
}: UsersClientProps) {
  // Permissions
  const canCreateUser = useHasPermission("users", "create");
  const canExportUsers = useHasPermission("users", "export");
  const canExportBT = useHasPermission("business_types", "export");
  const canExportBlacklist = useHasPermission("blacklist", "export");
  const canEditUser = useHasPermission("users", "edit");
  const canCreateBT = useHasPermission("business_types", "create");
  const canDeleteBT = useHasPermission("business_types", "delete");
  const canCreateBlacklist = useHasPermission("blacklist", "create");
  const canDeleteBlacklist = useHasPermission("blacklist", "delete");

  // User create dialog
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Business type dialog
  const [showCreateBT, setShowCreateBT] = useState(false);

  // User detail dialog
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // User edit dialog
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

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

  const handleEditUser = useCallback((user: AppUser) => {
    setEditingUser(user);
  }, []);

  const userColumns = useMemo(
    () => createColumns(businessTypeMap, handleViewUser, canEditUser ? handleEditUser : undefined),
    [businessTypeMap, handleViewUser, handleEditUser, canEditUser],
  );

  const renderUserToolbar = useCallback(
    () => (
      <>
        {canCreateUser && (
          <Button onClick={() => setShowCreateUser(true)} className="ml-auto">
            <Plus /> Add User
          </Button>
        )}
      </>
    ),
    [canCreateUser],
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
    let msg = `${selected.length === 1 ? names : `${selected.length} business types (${names})`} will be moved to the trash.`;

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
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs defaultValue="users" className="flex min-h-0 flex-1 flex-col">
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

        <TabsContent value="users" className="flex min-h-0 flex-1 flex-col">
          {users.length > 0 ? (
            <DataTable
              columns={userColumns}
              data={users}
              searchKeys={["username", "full_name", "phone", "email", "company_name"]}
              searchPlaceholder="Search users"
              filterConfig={userFilterConfig}
              filterStorageKey="users-filters"
              initialColumnVisibility={{ is_approved_partner: false }}
              enablePagination
              pageSize={10}
              toolbar={renderUserToolbar}
              enableExport={canExportUsers}
              exportFileName="users"
              fillHeight
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No users yet"
              description="Users will appear here once they register on the website or you create one."
              fullPage={false}
              action={
                canCreateUser ? (
                  <Button onClick={() => setShowCreateUser(true)}>
                    <Plus /> Add User
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        <TabsContent value="business-types" className="flex min-h-0 flex-1 flex-col">
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
              enableExport={canExportBT}
              exportFileName="business-types"
              fillHeight
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

        <TabsContent value="blacklist" className="flex min-h-0 flex-1 flex-col">
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
              enableExport={canExportBlacklist}
              exportFileName="blacklist"
              fillHeight
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

      {/* User create form */}
      {showCreateUser && (
        <UserForm
          open={showCreateUser}
          onOpenChange={setShowCreateUser}
          businessTypes={listedBusinessTypes}
          partnerTypes={partnerTypes}
          stateRegions={stateRegions}
          districts={districts}
          townships={townships}
          onPasswordGenerated={setGeneratedPassword}
        />
      )}

      {/* Auto-generated password reveal dialog */}
      <PasswordRevealDialog
        password={generatedPassword}
        onClose={() => setGeneratedPassword(null)}
      />

      {/* User detail dialog */}
      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onBlacklist={handleBlacklistFromDetail}
        businessTypeMap={businessTypeMap}
      />

      {/* User edit form */}
      {editingUser && (
        <UserEditForm
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null); }}
          businessTypes={listedBusinessTypes}
          stateRegions={stateRegions}
          districts={districts}
          townships={townships}
          onPasswordGenerated={setGeneratedPassword}
        />
      )}

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
    </div>
  );
}
