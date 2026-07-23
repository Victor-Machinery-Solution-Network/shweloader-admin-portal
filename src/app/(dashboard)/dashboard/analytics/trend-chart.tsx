import { getVisitorsTrend } from "@/lib/ga/queries";
import VisitorsChart from "../overview/visitors-chart";

export default async function TrendChart({ days = 90 }: { days?: number }) {
  let data: Awaited<ReturnType<typeof getVisitorsTrend>> = [];
  let errored = false;
  try {
    data = await getVisitorsTrend(days);
  } catch (e) {
    console.error("[analytics] trend chart", e);
    errored = true;
  }
  return <VisitorsChart initialData={data} errored={errored} />;
}
