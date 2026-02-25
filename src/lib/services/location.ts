import { createService } from "@/lib/api/create-service";
import type { StateRegion, District, Township } from "@/types/location";

export const stateRegionService = createService<StateRegion, "state_region_id">("state_region", {
  primaryKey: "state_region_id",
});

export const districtService = createService<District, "district_id">("district", {
  primaryKey: "district_id",
});

export const townshipService = createService<Township, "township_id">("township", {
  primaryKey: "township_id",
});
