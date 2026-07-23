import { getLandingPages } from "@/lib/ga/queries";
import { BarList } from "./bar-list";

export default async function LandingPages({ days = 30 }: { days?: number }) {
  const rows = await getLandingPages(days);
  return <BarList title="Landing pages" rows={rows} />;
}
