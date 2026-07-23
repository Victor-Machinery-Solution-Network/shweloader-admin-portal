import { getLandingPages, type NameCount } from "@/lib/ga/queries";
import { BarList, SectionError } from "./bar-list";

export default async function LandingPages({ days = 30 }: { days?: number }) {
  let rows: NameCount[] = [];
  let failed = false;
  try {
    rows = await getLandingPages(days);
  } catch (e) {
    console.error("[analytics] landing-pages", e);
    failed = true;
  }
  if (failed) return <SectionError title="Landing pages" />;
  return <BarList title="Landing pages" rows={rows} />;
}
