import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getUsersPageData, getStateRegions, getDistricts, getTownships, getPartnerTypes } from "@/lib/cache";
import { UsersClient } from "@/components/features/users/users-client";

export const metadata = {
  title: "Users",
  description: "Manage users and business types",
};

export default function UsersPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <PageHeader
        title="Users"
        description="Manage users and business types"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="users">
          <UsersContent />
        </PermissionGate>
      </Suspense>
    </div>
  );
}

async function UsersContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.USERS, CACHE_TAGS.BUSINESS_TYPES, CACHE_TAGS.PARTNERS, CACHE_TAGS.PARTNER_TYPES, CACHE_TAGS.BLACKLIST, CACHE_TAGS.LOCATIONS);

  const [{ users, businessTypes, listedBusinessTypes, blacklistEntries }, stateRegions, districts, townships, partnerTypes] =
    await Promise.all([
      getUsersPageData(),
      getStateRegions(),
      getDistricts(),
      getTownships(),
      getPartnerTypes(),
    ]);

  return (
    <UsersClient
      users={users}
      businessTypes={businessTypes}
      listedBusinessTypes={listedBusinessTypes}
      blacklistEntries={blacklistEntries}
      stateRegions={stateRegions}
      districts={districts}
      townships={townships}
      partnerTypes={partnerTypes}
    />
  );
}
