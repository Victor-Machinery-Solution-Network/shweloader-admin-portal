import { createService } from "@/lib/api";
import type { Role } from "@/types/role";

export const roleService = createService<Role>("role", {
  primaryKey: "role_id",
});
