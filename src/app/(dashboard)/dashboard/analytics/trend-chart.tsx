import { getVisitorsTrend } from "@/lib/ga/queries";
import VisitorsChart from "../overview/visitors-chart";

export default async function TrendChart({ days = 90 }: { days?: number }) {
  let data: Awaited<ReturnType<typeof getVisitorsTrend>> = [];
  let errored = false;
  try {
    data = await getVisitorsTrend(days);
  } catch {
    errored = true;
  }
  return <VisitorsChart initialData={data} errored={errored} />;
}
