import { createService } from "@/lib/api";
import type { AdminUser } from "@/types/admin";

export const adminUserService = createService<AdminUser>("admin_user", {
  primaryKey: "user_id",
});
