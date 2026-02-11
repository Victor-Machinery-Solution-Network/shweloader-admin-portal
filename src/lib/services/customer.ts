import { createService } from "@/lib/api/create-service";
import type { Customer } from "@/types/customer";
import type { BusinessType } from "@/types/customer";

export const customerService = createService<Customer>("customer", {
  primaryKey: "customer_id",
});

export const businessTypeService = createService<BusinessType>("business_type", {
  primaryKey: "business_type_id",
});
