import { createService } from "@/lib/api";
import type { AttachmentCategory, AttachmentModel } from "@/types/attachment";

export const attachmentCategoryService = createService<AttachmentCategory>(
  "attachment_category",
  { primaryKey: "category_id" },
);

export const attachmentModelService = createService<AttachmentModel>(
  "attachment_model",
  { primaryKey: "model_id" },
);
