import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getAdmins, getRolesForAssignment } from "@/lib/cache";
import { AdminsClient } from "@/components/features/admins/admins-client";

export const metadata = {
  title: "Admins",
  description: "Manage admin users",
};

export default function AdminsPage() {
  return (
    <>
      <PageHeader
        title="Admins"
        description="Manage admin accounts and role assignments"
      />
      <Suspense fallback={<DataTableSkeleton columns={5} />}>
        <AdminsContent />
      </Suspense>
    </>
  );
}

async function AdminsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ADMINS);

  const [admins, roles] = await Promise.all([
    getAdmins(),
    getRolesForAssignment(),
  ]);

  return <AdminsClient admins={admins} roles={roles} />;
}
