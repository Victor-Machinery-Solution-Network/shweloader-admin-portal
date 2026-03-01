import { createService } from "@/lib/api";
import type { AdminUser } from "@/types/admin";

export const adminUserService = createService<AdminUser, "user_id">("admin_user", {
  primaryKey: "user_id",
  softDelete: true,
});
