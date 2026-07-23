import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getOverviewStats } from "@/lib/actions/dashboard";
import DashboardOverviewClient from "./overview-client";

export const metadata = { title: "Overview", description: "Dashboard overview" };

async function OverviewData() {
  const stats = await getOverviewStats();
  return <DashboardOverviewClient stats={stats} />;
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/40" />
      ))}
    </div>
  );
}

export default function DashboardOverviewPage() {
  // PermissionGate reads the session (dynamic/uncached), so it must sit inside a
  // Suspense boundary under cacheComponents. The visitors chart now lives only on
  // the Analytics page — Overview is the business-KPI cards.
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <PermissionGate feature="dashboard">
        <OverviewData />
      </PermissionGate>
    </Suspense>
  );
}
