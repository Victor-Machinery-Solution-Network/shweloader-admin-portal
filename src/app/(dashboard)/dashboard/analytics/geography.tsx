import { getGeography } from "@/lib/ga/queries";
import { BarList } from "./bar-list";

export default async function Geography({ days = 30 }: { days?: number }) {
  const { countries, cities } = await getGeography(days);
  return (
    <div className="grid gap-4">
      <BarList title="Countries" rows={countries} />
      <BarList title="Cities" rows={cities} />
    </div>
  );
}
