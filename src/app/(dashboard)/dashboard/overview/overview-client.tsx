"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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

type TimePeriod = "3months" | "30days" | "7days";

function generateChartData(period: TimePeriod) {
  if (period === "7days") {
    return [
      { date: "Mar 5", mobile: 320, desktop: 280 },
      { date: "Mar 6", mobile: 450, desktop: 390 },
      { date: "Mar 7", mobile: 280, desktop: 320 },
      { date: "Mar 8", mobile: 510, desktop: 420 },
      { date: "Mar 9", mobile: 380, desktop: 350 },
      { date: "Mar 10", mobile: 430, desktop: 480 },
      { date: "Mar 11", mobile: 530, desktop: 460 },
    ];
  }

  if (period === "30days") {
    return Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      return {
        date: `Feb ${day}`,
        mobile: Math.floor(200 + Math.sin(day * 0.5) * 200 + Math.random() * 100),
        desktop: Math.floor(180 + Math.cos(day * 0.4) * 180 + Math.random() * 80),
      };
    });
  }

  // 3 months — daily data for Jun (matches screenshot style)
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    return {
      date: `Jun ${day}`,
      mobile: Math.floor(250 + Math.sin(day * 0.7) * 250 + Math.random() * 80),
      desktop: Math.floor(200 + Math.cos(day * 0.6) * 200 + Math.random() * 60),
    };
  });
}

const chartConfig = {
  mobile: {
    label: "Mobile",
    color: "var(--color-foreground)",
  },
  desktop: {
    label: "Desktop",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const periodLabels: Record<TimePeriod, string> = {
  "3months": "Last 3 months",
  "30days": "Last 30 days",
  "7days": "Last 7 days",
};

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

function VisitorsChart() {
  const [period, setPeriod] = useState<TimePeriod>("3months");
  const data = generateChartData(period);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">Total Visitors</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total for the{" "}
            {period === "3months"
              ? "last 3 months"
              : period === "30days"
                ? "last 30 days"
                : "last 7 days"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {(Object.entries(periodLabels) as [TimePeriod, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-foreground)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-foreground)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tickFormatter={(value) => {
                // Show fewer labels on wider datasets
                return value;
              }}
            />
            <YAxis hide />
            <ChartTooltip
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-primary)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
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
