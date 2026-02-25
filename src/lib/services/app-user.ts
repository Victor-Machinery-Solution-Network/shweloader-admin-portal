import { createService } from "@/lib/api/create-service";
import type { AppUser } from "@/types/app-user";
import type { BusinessType } from "@/types/app-user";

export const appUserService = createService<AppUser, "app_user_id">("app_user", {
  primaryKey: "app_user_id",
});

export const businessTypeService = createService<BusinessType, "business_type_id">("business_type", {
  primaryKey: "business_type_id",
});
