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
import type { OverviewStats } from "@/lib/actions/dashboard";

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

// ---------- Formatting ----------

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const plain = new Intl.NumberFormat("en");

/** Month-to-date growth: added-this-month vs the total at the start of the month. */
function monthGrowthPct(monthly: number, total: number): number {
  const base = total - monthly;
  if (base <= 0) return monthly > 0 ? 100 : 0;
  return Math.round((monthly / base) * 1000) / 10;
}

// ---------- Card model ----------

interface StatCardData {
  title: string;
  value: string;
  /** Full-precision value for the hover tooltip (compact values round). */
  exact?: string;
  change: number;
  trend: string;
  subtitle: string;
}

function buildCards(s: OverviewStats): StatCardData[] {
  return [
    {
      title: "Total Sale Product Value",
      value: `MMK ${compact.format(s.saleValueMmk)}`,
      exact: `MMK ${plain.format(s.saleValueMmk)} · $${plain.format(s.saleValueUsd)}`,
      change: monthGrowthPct(s.monthlySaleValueMmk, s.saleValueMmk),
      trend: `≈ $${compact.format(s.saleValueUsd)} USD`,
      subtitle: "Approved sale listings, catalog total",
    },
    {
      title: "Total Users",
      value: plain.format(s.users),
      change: monthGrowthPct(s.monthlyUsers, s.users),
      trend: `+${plain.format(s.monthlyUsers)} this month`,
      subtitle: "Registered app users",
    },
    {
      title: "Total Partners",
      value: plain.format(s.partners),
      change: monthGrowthPct(s.monthlyPartners, s.partners),
      trend: `+${plain.format(s.monthlyPartners)} this month`,
      subtitle: "Active partner businesses",
    },
    {
      title: "Total Sale Units",
      value: plain.format(s.saleUnits),
      change: monthGrowthPct(s.monthlySaleUnits, s.saleUnits),
      trend: `+${plain.format(s.monthlySaleUnits)} this month`,
      subtitle: "Approved machines listed for sale",
    },
    {
      title: "Total Rent Units",
      value: plain.format(s.rentUnits),
      change: monthGrowthPct(s.monthlyRentUnits, s.rentUnits),
      trend: `+${plain.format(s.monthlyRentUnits)} this month`,
      subtitle: "Approved machines listed for rent",
    },
    {
      title: "Product Enquiries",
      value: plain.format(s.productEnquiries),
      change: monthGrowthPct(s.monthlyProductEnquiries, s.productEnquiries),
      trend: `+${plain.format(s.monthlyProductEnquiries)} this month`,
      subtitle: "Unique products asked about in chat",
    },
    {
      title: "User Enquiries",
      value: plain.format(s.userEnquiries),
      change: monthGrowthPct(s.monthlyUserEnquiries, s.userEnquiries),
      trend: `+${plain.format(s.monthlyUserEnquiries)} this month`,
      subtitle: "Chat sessions started",
    },
  ];
}

// ---------- Components ----------

function StatCard({ title, value, exact, change, trend, subtitle }: StatCardData) {
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
        <p className="text-3xl font-bold tracking-tight" title={exact}>
          {value}
        </p>
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

export default function DashboardOverviewClient({
  stats,
}: {
  stats: OverviewStats;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {buildCards(stats).map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
      {/* Chart data is still the placeholder set — real series TBD with
          stakeholders (next session). */}
      <VisitorsChart />
    </div>
  );
}
