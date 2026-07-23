import { getTrafficSources } from "@/lib/ga/queries";
import { BarList } from "./bar-list";

export default async function TrafficSources({ days = 30 }: { days?: number }) {
  const rows = await getTrafficSources(days);
  return <BarList title="Traffic sources" rows={rows} />;
}
