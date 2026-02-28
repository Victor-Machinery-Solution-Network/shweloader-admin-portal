import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getUsers, getBusinessTypes, getListedBusinessTypes, getBlacklistEntries } from "@/lib/cache";
import { UsersClient } from "@/components/features/users/users-client";

export const metadata = {
  title: "Users",
  description: "Manage users and business types",
};

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="Manage users and business types"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="users">
          <UsersContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function UsersContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.USERS, CACHE_TAGS.BUSINESS_TYPES, CACHE_TAGS.PARTNERS, CACHE_TAGS.BLACKLIST);

  const [users, businessTypes, listedBusinessTypes, blacklistEntries] = await Promise.all([
    getUsers(),
    getBusinessTypes(),
    getListedBusinessTypes(),
    getBlacklistEntries(),
  ]);

  return (
    <UsersClient
      users={users}
      businessTypes={businessTypes}
      listedBusinessTypes={listedBusinessTypes}
      blacklistEntries={blacklistEntries}
    />
  );
}
