import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getOverviewStats } from "@/lib/actions/dashboard";
import DashboardOverviewClient from "./overview-client";

export const metadata = {
  title: "Overview",
  description: "Dashboard overview",
};

/** Async island: the stats query is dynamic IO, so it lives inside Suspense. */
async function OverviewData() {
  const stats = await getOverviewStats();
  return <DashboardOverviewClient stats={stats} />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="h-[400px] animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <PermissionGate feature="dashboard">
        <OverviewData />
      </PermissionGate>
    </Suspense>
  );
}
