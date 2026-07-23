import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NameCount } from "@/lib/ga/queries";

export function BarList({
  title,
  rows,
  empty = "No data yet.",
}: {
  title: string;
  rows: NameCount[];
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
        {rows.map((r) => (
          <div key={r.name} className="relative">
            <div
              className="absolute inset-y-0 left-0 rounded bg-primary/10"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
            <div className="relative flex justify-between px-2 py-1 text-sm">
              <span className="truncate">{r.name || "(not set)"}</span>
              <span className="tabular-nums text-muted-foreground">{r.value}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SectionError({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load this section from Google Analytics.
        </p>
      </CardContent>
    </Card>
  );
}
