"use client";

import dynamic from "next/dynamic";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Recharts is ~370KB — load it only after the stats cards have painted.
const VisitorsChart = dynamic(() => import("./visitors-chart"), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted/60" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full animate-pulse rounded bg-muted/40" />
      </CardContent>
    </Card>
  ),
});

// ---------- Fake data ----------

const statsCards = [
  {
    title: "Total Revenue",
    value: "$1,250.00",
    change: +12.5,
    trend: "Trending up this month",
    subtitle: "Visitors for the last 6 months",
  },
  {
    title: "New Users",
    value: "1,234",
    change: -20,
    trend: "Down 20% this period",
    subtitle: "Acquisition needs attention",
  },
  {
    title: "Active Accounts",
    value: "45,678",
    change: +12.5,
    trend: "Strong user retention",
    subtitle: "Engagement exceed targets",
  },
  {
    title: "Growth Rate",
    value: "4.5%",
    change: +4.5,
    trend: "Steady performance",
    subtitle: "Meets growth projections",
  },
];

// ---------- Components ----------

function StatCard({
  title,
  value,
  change,
  trend,
  subtitle,
}: (typeof statsCards)[number]) {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Badge
            variant={isPositive ? "success" : "destructive"}
            className="gap-1 text-xs"
          >
            <TrendIcon className="size-3" />
            {isPositive ? "+" : ""}
            {change}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <div className="space-y-0.5">
          <p className="flex items-center gap-1 text-sm font-medium">
            {trend}
            <TrendIcon className="size-4" />
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardOverviewClient() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
      <VisitorsChart />
    </div>
  );
}
