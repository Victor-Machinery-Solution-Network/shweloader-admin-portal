import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusyHours } from "@/lib/ga/queries";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function BusyHours({ days = 30 }: { days?: number }) {
  const cells = await getBusyHours(days);
  const max = Math.max(1, ...cells.map((c) => c.value));
  const at = (d: number, h: number) =>
    cells.find((c) => c.day === d && c.hour === h)?.value ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Busy hours (visitors by hour)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[560px] space-y-1">
          {DAYS.map((label, d) => (
            <div key={d} className="flex items-center gap-1">
              <span className="w-8 text-xs text-muted-foreground">{label}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const v = at(d, h);
                return (
                  <div
                    key={h}
                    title={`${label} ${h}:00 — ${v}`}
                    className="h-4 flex-1 rounded-sm"
                    style={{ backgroundColor: `oklch(0.6 0.15 250 / ${v / max})` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
