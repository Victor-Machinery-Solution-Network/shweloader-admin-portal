import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getActivityLogsData } from "@/lib/cache";
import { ActivityLogsClient } from "@/components/features/activity-logs/activity-logs-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Activity Logs",
  description: "View admin activity history",
};

export default function ActivityLogsPage() {
  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Track admin actions across the portal"
      />
      <Suspense fallback={<DataTableSkeleton columns={4} />}>
        <PermissionGate feature="admin_users">
          <ActivityLogsContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function ActivityLogsContent() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag(CACHE_TAGS.ACTIVITY_LOGS);

  const logs = await getActivityLogsData();

  return <ActivityLogsClient logs={logs} />;
}
