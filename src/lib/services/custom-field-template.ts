import { createService } from "@/lib/api/create-service";
import type { CustomFieldTemplate } from "@/types/custom-field";

export const customFieldTemplateService = createService<CustomFieldTemplate, "template_id">(
  "custom_field_template",
  { primaryKey: "template_id", softDelete: true },
);
