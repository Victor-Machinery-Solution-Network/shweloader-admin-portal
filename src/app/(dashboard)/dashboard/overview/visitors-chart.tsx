"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TrendPoint } from "@/lib/ga/queries";

type TimePeriod = "3months" | "30days" | "7days";
const sliceDays: Record<TimePeriod, number> = {
  "3months": 90,
  "30days": 30,
  "7days": 7,
};
const periodLabels: Record<TimePeriod, string> = {
  "3months": "Last 3 months",
  "30days": "Last 30 days",
  "7days": "Last 7 days",
};

const chartConfig = {
  desktop: { label: "Desktop", color: "var(--color-primary)" },
  mobile: { label: "Mobile", color: "var(--color-foreground)" },
  app: { label: "App", color: "var(--chart-3, oklch(0.7 0.15 160))" },
} satisfies ChartConfig;

export default function VisitorsChart({
  initialData,
  errored = false,
}: {
  initialData: TrendPoint[];
  errored?: boolean;
}) {
  const [period, setPeriod] = useState<TimePeriod>("3months");
  const data = initialData.slice(-sliceDays[period]);
  const label = (d: string) => d.slice(5); // "07-23"

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">Total Visitors</CardTitle>
          <p className="text-sm text-muted-foreground">
            Website (desktop + mobile) and the app, {periodLabels[period].toLowerCase()}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {(Object.entries(periodLabels) as [TimePeriod, string][]).map(
            ([key, l]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ),
          )}
        </div>
      </CardHeader>
      <CardContent>
        {errored ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Couldn&apos;t load visitor data from Google Analytics.
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No visitor data yet — GA4 collects from the day the tag went live.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {(["desktop", "mobile", "app"] as const).map((k) => (
                  <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig[k].color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={chartConfig[k].color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                tickFormatter={label}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              {(["desktop", "mobile", "app"] as const).map((k) => (
                <Area
                  key={k}
                  dataKey={k}
                  type="natural"
                  fill={`url(#fill-${k})`}
                  stroke={chartConfig[k].color}
                  strokeWidth={2}
                  stackId="a"
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
