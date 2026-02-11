import { createService } from "@/lib/api/create-service";
import type { Partner } from "@/types/partner";
import type { PartnerType, PartnerStatusType } from "@/types/partner";

export const partnerService = createService<Partner>("partner", {
  primaryKey: "id",
});

export const partnerTypeService = createService<PartnerType>("partner_type", {
  primaryKey: "id",
});

export const partnerStatusTypeService = createService<PartnerStatusType>(
  "partner_status_type",
  { primaryKey: "id" },
);
