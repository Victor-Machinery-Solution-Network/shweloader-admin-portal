import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getListingMix, getOverviewStats } from "@/lib/actions/dashboard";
import DashboardOverviewClient from "./overview-client";
import ListingMixCharts from "./listing-mix";

export const metadata = { title: "Overview", description: "Dashboard overview" };

async function OverviewData() {
  const [stats, mix] = await Promise.all([getOverviewStats(), getListingMix()]);
  return (
    <div className="space-y-4">
      <DashboardOverviewClient stats={stats} />
      <ListingMixCharts mix={mix} />
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="h-[420px] animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
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
