import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getRoles, getFeaturePermissions, getRolePermissionMap } from "@/lib/cache";
import { getAdminCountByRole } from "@/lib/actions/role";
import { RolesClient } from "@/components/features/roles/roles-client";

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
      <Suspense fallback={<DataTableSkeleton columns={5} />}>
        <RolesContent />
      </Suspense>
    </>
  );
}

async function RolesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ROLES, CACHE_TAGS.FEATURE_PERMISSIONS);

  const [roles, featurePermissions, rolePermissionMap] = await Promise.all([
    getRoles(),
    getFeaturePermissions(),
    getRolePermissionMap(),
  ]);

  const roleIds = roles.map((r) => r.role_id);
  const adminCounts = await getAdminCountByRole(roleIds);

  return (
    <RolesClient
      roles={roles}
      featurePermissions={featurePermissions}
      adminCounts={adminCounts}
      rolePermissionMap={rolePermissionMap}
    />
  );
}
