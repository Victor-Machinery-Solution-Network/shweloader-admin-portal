import { createService } from "@/lib/api";
import type { AttachmentCategory } from "@/types/attachment";

export const attachmentCategoryService = createService<AttachmentCategory>(
  "attachment_category",
  { primaryKey: "category_id" },
);
