import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";
import RealtimeStrip from "./realtime-strip";
import KpiRow from "./kpi-row";
import TrendChart from "./trend-chart";
import TopPages from "./top-pages";
import TrafficSources from "./traffic-sources";
import Geography from "./geography";
import Devices from "./devices";
import LandingPages from "./landing-pages";
import BusyHours from "./busy-hours";

export const metadata = {
  title: "Dashboard Analytics",
  description: "Analytics and insights for your admin portal",
};

function Block({ h = "h-40" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-xl border bg-muted/40`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Block h="h-24" />
      <Block />
      <Block h="h-[400px]" />
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Block key={i} h="h-80" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardAnalyticsPage() {
  // PermissionGate reads the session (dynamic/uncached), so it must itself sit
  // inside a Suspense boundary under cacheComponents. The inner Suspense
  // boundaries below it still stream each section independently.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PermissionGate feature="analytics">
        <div className="space-y-6">
          <RealtimeStrip />
          <Suspense fallback={<Block />}>
            <KpiRow days={30} />
          </Suspense>
          <Suspense fallback={<Block h="h-[400px]" />}>
            <TrendChart days={90} />
          </Suspense>
          <div className="grid gap-6 xl:grid-cols-2">
            <Suspense fallback={<Block h="h-80" />}>
              <TopPages days={30} />
            </Suspense>
            <Suspense fallback={<Block h="h-80" />}>
              <TrafficSources days={30} />
            </Suspense>
            <Suspense fallback={<Block h="h-80" />}>
              <Geography days={30} />
            </Suspense>
            <Suspense fallback={<Block h="h-80" />}>
              <Devices days={30} />
            </Suspense>
            <Suspense fallback={<Block h="h-80" />}>
              <LandingPages days={30} />
            </Suspense>
            <Suspense fallback={<Block h="h-80" />}>
              <BusyHours days={30} />
            </Suspense>
          </div>
        </div>
      </PermissionGate>
    </Suspense>
  );
}
