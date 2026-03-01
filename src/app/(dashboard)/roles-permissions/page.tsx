import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getRolesPageData } from "@/lib/actions/role";
import { RolesClient } from "@/components/features/roles/roles-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Roles & Permissions",
  description: "Manage roles and permissions",
};

export default function RolesPermissionsPage() {
  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Define roles and assign feature-level permissions"
      />
      <Suspense fallback={<DataTableSkeleton columns={6} />}>
        <PermissionGate feature="roles">
          <RolesContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function RolesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ROLES, CACHE_TAGS.FEATURE_PERMISSIONS);

  const { roles, featurePermissions, rolePermissionMap, adminCounts } =
    await getRolesPageData();

  return (
    <RolesClient
      roles={roles}
      featurePermissions={featurePermissions}
      adminCounts={adminCounts}
      rolePermissionMap={rolePermissionMap}
    />
  );
}
