import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopPages } from "@/lib/ga/queries";

function mmss(s: number) {
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export default async function TopPages({ days = 30 }: { days?: number }) {
  const rows = await getTopPages(days);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top pages</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 text-right font-medium">Views</th>
                <th className="pb-2 text-right font-medium">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.path} className="border-t">
                  <td className="max-w-[220px] truncate py-2" title={r.title || r.path}>
                    {r.title || r.path}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.views}</td>
                  <td className="py-2 text-right tabular-nums">{mmss(r.avgSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
