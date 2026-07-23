"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OverviewStats } from "@/lib/actions/dashboard";

// ---------- Formatting ----------

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
  change: number;
  /** Optional secondary value line (e.g. the USD equivalent). */
  secondary?: string;
  /** Wide card: spans 2 grid columns. */
  span2?: boolean;
}

function buildCards(s: OverviewStats): StatCardData[] {
  return [
    {
      title: "Total Sale Product Value",
      value: `MMK ${plain.format(s.saleValueMmk)}`,
      change: monthGrowthPct(s.monthlySaleValueMmk, s.saleValueMmk),
      secondary: `≈ $${plain.format(s.saleValueUsd)} USD`,
      span2: true,
    },
    {
      title: "Total Users",
      value: plain.format(s.users),
      change: monthGrowthPct(s.monthlyUsers, s.users),
    },
    {
      title: "Total Partners",
      value: plain.format(s.partners),
      change: monthGrowthPct(s.monthlyPartners, s.partners),
    },
    {
      title: "Total Sale Units",
      value: plain.format(s.saleUnits),
      change: monthGrowthPct(s.monthlySaleUnits, s.saleUnits),
    },
    {
      title: "Total Rent Units",
      value: plain.format(s.rentUnits),
      change: monthGrowthPct(s.monthlyRentUnits, s.rentUnits),
    },
    {
      title: "Product Enquiries",
      value: plain.format(s.productEnquiries),
      change: monthGrowthPct(s.monthlyProductEnquiries, s.productEnquiries),
    },
    {
      title: "User Enquiries",
      value: plain.format(s.userEnquiries),
      change: monthGrowthPct(s.monthlyUserEnquiries, s.userEnquiries),
    },
  ];
}

// ---------- Components ----------

function StatCard({ title, value, change, secondary, span2 }: StatCardData) {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    // gap-4 (Card default is 6): tighter space between the metric label and value.
    <Card className={span2 ? "gap-4 sm:col-span-2" : "gap-4"}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {/* No movement this month → no pill (a +0% badge reads as noise). */}
          {change !== 0 && (
            <Badge
              variant={isPositive ? "success" : "destructive"}
              className="gap-1 text-xs"
            >
              <TrendIcon className="size-3" />
              {isPositive ? "+" : ""}
              {change}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="flex flex-wrap items-baseline gap-x-2 text-3xl font-bold tracking-tight">
          {value}
          {secondary && (
            <span className="text-sm font-medium text-muted-foreground">
              {secondary}
            </span>
          )}
        </p>
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {buildCards(stats).map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
}
