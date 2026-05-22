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

export default function VisitorsChart() {
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
              tickFormatter={(value) => value}
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
