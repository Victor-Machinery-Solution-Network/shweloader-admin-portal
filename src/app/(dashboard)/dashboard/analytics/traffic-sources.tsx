import { getTrafficSources, type NameCount } from "@/lib/ga/queries";
import { BarList, SectionError } from "./bar-list";

export default async function TrafficSources({ days = 30 }: { days?: number }) {
  let rows: NameCount[] = [];
  let failed = false;
  try {
    rows = await getTrafficSources(days);
  } catch (e) {
    console.error("[analytics] traffic-sources", e);
    failed = true;
  }
  if (failed) return <SectionError title="Traffic sources" />;
  return <BarList title="Traffic sources" rows={rows} />;
}
