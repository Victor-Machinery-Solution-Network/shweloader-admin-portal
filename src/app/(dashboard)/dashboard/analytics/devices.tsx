import { getDevices, type NameCount } from "@/lib/ga/queries";
import { BarList, SectionError } from "./bar-list";

export default async function Devices({ days = 30 }: { days?: number }) {
  let categories: NameCount[] = [];
  let browsers: NameCount[] = [];
  let failed = false;
  try {
    ({ categories, browsers } = await getDevices(days));
  } catch (e) {
    console.error("[analytics] devices", e);
    failed = true;
  }
  if (failed) return <SectionError title="Devices" />;
  return (
    <div className="grid gap-4">
      <BarList title="Device category" rows={categories} />
      <BarList title="Browsers" rows={browsers} />
    </div>
  );
}
