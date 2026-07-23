import { getDevices } from "@/lib/ga/queries";
import { BarList } from "./bar-list";

export default async function Devices({ days = 30 }: { days?: number }) {
  const { categories, browsers } = await getDevices(days);
  return (
    <div className="grid gap-4">
      <BarList title="Device category" rows={categories} />
      <BarList title="Browsers" rows={browsers} />
    </div>
  );
}
