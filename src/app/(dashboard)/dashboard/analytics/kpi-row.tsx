import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getKpis } from "@/lib/ga/queries";

const plain = new Intl.NumberFormat("en");

export default async function KpiRow({ days = 30 }: { days?: number }) {
  const kpis = await getKpis(days);
  if (kpis.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Analytics not configured yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => {
        const up = k.changePct >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        return (
          <Card key={k.key} className="gap-4">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                {k.changePct !== 0 && (
                  <Badge variant={up ? "success" : "destructive"} className="gap-1 text-xs">
                    <Icon className="size-3" />
                    {up ? "+" : ""}
                    {k.changePct}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight tabular-nums">
                {plain.format(k.value)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
