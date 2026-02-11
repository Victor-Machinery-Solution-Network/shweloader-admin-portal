import { createService } from "@/lib/api/create-service";
import type { Location } from "@/types/location";

export const locationService = createService<Location>("location", {
  primaryKey: "location_id",
});
