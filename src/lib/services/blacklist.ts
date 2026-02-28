import { createService } from "@/lib/api";
import type { BlacklistEntry } from "@/types/blacklist";

export const blacklistService = createService<BlacklistEntry, "blacklist_id">(
  "blacklist",
  { primaryKey: "blacklist_id" },
);
