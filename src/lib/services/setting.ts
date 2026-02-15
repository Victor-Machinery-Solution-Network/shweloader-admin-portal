import { createService } from "@/lib/api";
import type { AppSetting } from "@/types/setting";

export const settingService = createService<AppSetting>("app_setting", {
  primaryKey: "id",
});
