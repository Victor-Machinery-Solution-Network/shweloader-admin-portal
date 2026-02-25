import { createService } from "@/lib/api";
import type { AttachmentCategory, AttachmentModel } from "@/types/attachment";

export const attachmentCategoryService = createService<AttachmentCategory, "category_id">(
  "attachment_category",
  { primaryKey: "category_id" },
);

export const attachmentModelService = createService<AttachmentModel, "model_id">(
  "attachment_model",
  { primaryKey: "model_id" },
);
