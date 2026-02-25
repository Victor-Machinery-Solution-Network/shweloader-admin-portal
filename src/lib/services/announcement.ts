import { createService } from "@/lib/api/create-service";
import type { AnnouncementText } from "@/types/announcement";

export const announcementTextService = createService<AnnouncementText, "announcement_id">(
  "announcement_text",
  { primaryKey: "announcement_id" },
);
