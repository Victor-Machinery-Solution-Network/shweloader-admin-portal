import { getGeography, type NameCount } from "@/lib/ga/queries";
import { BarList, SectionError } from "./bar-list";

export default async function Geography({ days = 30 }: { days?: number }) {
  let countries: NameCount[] = [];
  let cities: NameCount[] = [];
  let failed = false;
  try {
    ({ countries, cities } = await getGeography(days));
  } catch (e) {
    console.error("[analytics] geography", e);
    failed = true;
  }
  if (failed) return <SectionError title="Geography" />;
  return (
    <div className="grid gap-4">
      <BarList title="Countries" rows={countries} />
      <BarList title="Cities" rows={cities} />
    </div>
  );
}
