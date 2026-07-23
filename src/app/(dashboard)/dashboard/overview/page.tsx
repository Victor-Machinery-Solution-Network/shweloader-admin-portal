import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getOverviewStats } from "@/lib/actions/dashboard";
import { getVisitorsTrend } from "@/lib/ga/queries";
import DashboardOverviewClient from "./overview-client";
import VisitorsChart from "./visitors-chart";

export const metadata = { title: "Overview", description: "Dashboard overview" };

async function OverviewData() {
  const stats = await getOverviewStats();
  return <DashboardOverviewClient stats={stats} />;
}

/** Separate island: GA can fail without touching the D1 cards. */
async function ChartData() {
  let data: Awaited<ReturnType<typeof getVisitorsTrend>> = [];
  let errored = false;
  try {
    data = await getVisitorsTrend(90);
  } catch (e) {
    console.error("[overview] visitors chart", e);
    errored = true;
  }
  return <VisitorsChart initialData={data} errored={errored} />;
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

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <CardsSkeleton />
      <div className="h-[400px] animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}

export default function DashboardOverviewPage() {
  // PermissionGate reads the session (dynamic/uncached), so it must itself sit
  // inside a Suspense boundary under cacheComponents. The two inner Suspense
  // boundaries below it still isolate the GA chart from the D1 cards.
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <PermissionGate feature="dashboard">
        <div className="space-y-6">
          <Suspense fallback={<CardsSkeleton />}>
            <OverviewData />
          </Suspense>
          <Suspense
            fallback={<div className="h-[400px] animate-pulse rounded-xl border bg-muted/40" />}
          >
            <ChartData />
          </Suspense>
        </div>
      </PermissionGate>
    </Suspense>
  );
}
