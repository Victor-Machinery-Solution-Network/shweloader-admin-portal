"use client";

import { Label, Pie, PieChart, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
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
import { cn } from "@/lib/utils";
import type { ListingMix, MixSlice } from "@/lib/actions/dashboard";

/**
 * One hue per subcategory. The count is data-driven (25 on prod and growing),
 * so the hues are generated rather than listed: stepped by the golden angle,
 * which keeps slices that land next to each other on the ring far apart in hue.
 * Lightness and chroma come from CSS so light and dark each get their own step.
 */
const hueFor = (i: number) =>
  `oklch(var(--viz-l) var(--viz-c) ${(i * 137.508) % 360}deg)`;

const plain = new Intl.NumberFormat("en");
const pct = (value: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((value / total) * 1000) / 10}%`;

interface Datum {
  name: string;
  value: number;
  fill: string;
}

/**
 * Both donuts share one slice list, so a subcategory keeps the same colour in
 * each — the two charts sit side by side and get compared.
 */
function toData(slices: MixSlice[], key: "sale" | "rent"): Datum[] {
  return slices
    .map((s, i) => ({ name: s.name, value: s[key], fill: hueFor(i) }))
    .filter((d) => d.value > 0);
}

function DonutCard({
  title,
  data,
  total,
}: {
  title: string;
  data: Datum[];
  total: number;
}) {
  // Labels only — no `color`, so ChartStyle emits no CSS vars for names with
  // spaces; each slice carries its own `fill`.
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name }]),
  );

  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No listings yet
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ChartContainer
              config={config}
              className="aspect-square h-[320px] w-[320px] shrink-0"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="name"
                      formatter={(value, name) => (
                        <span className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {plain.format(Number(value))} (
                            {pct(Number(value), total)})
                          </span>
                        </span>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  // outerRadius + the 6px hover pop must clear the 320px box
                  // (160px half, less recharts' default 5px margin), hence 146.
                  innerRadius={98}
                  outerRadius={146}
                  paddingAngle={2}
                  cornerRadius={3}
                  stroke="none"
                  activeShape={({
                    outerRadius = 0,
                    ...props
                  }: PieSectorDataItem) => (
                    <Sector {...props} outerRadius={outerRadius + 6} />
                  )}
                >
                  <Label
                    position="center"
                    content={({ viewBox }) =>
                      viewBox && "cx" in viewBox ? (
                        <text
                          x={viewBox.cx}
                          // Two lines centred as a block: lift by half the
                          // second line so the pair straddles the ring's middle
                          // instead of hanging under it.
                          y={(viewBox.cy ?? 0) - 8}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {plain.format(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            dy="1.6em"
                            className="fill-muted-foreground text-[11px] tracking-wider"
                          >
                            LISTINGS
                          </tspan>
                        </text>
                      ) : null
                    }
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend doubles as the table view: every subcategory with its
                exact count and share, so identity is never colour-alone and the
                small slivers stay readable. Two columns once the list outgrows
                the donut, capped at the donut's height so the card can't run
                away as the catalogue grows. */}
            <ul
              className={cn(
                "w-full min-w-0 text-sm",
                data.length > 9
                  ? "grid max-h-[320px] grid-cols-1 gap-x-8 gap-y-1.5 overflow-y-auto sm:grid-cols-2"
                  : "space-y-1.5",
              )}
            >
              {data.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: d.fill }}
                  />
                  <span className="truncate text-muted-foreground">
                    {d.name}
                  </span>
                  <span className="ml-auto shrink-0 font-medium tabular-nums">
                    {plain.format(d.value)}
                  </span>
                  <span className="w-12 shrink-0 text-right text-muted-foreground tabular-nums">
                    {pct(d.value, total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ListingMixCharts({ mix }: { mix: ListingMix }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DonutCard
        title="For Sale Listings by Subcategory"
        data={toData(mix.slices, "sale")}
        total={mix.saleTotal}
      />
      <DonutCard
        title="For Rent Listings by Subcategory"
        data={toData(mix.slices, "rent")}
        total={mix.rentTotal}
      />
    </div>
  );
}
