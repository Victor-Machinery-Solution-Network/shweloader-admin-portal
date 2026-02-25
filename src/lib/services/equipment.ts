import { createService } from "@/lib/api";
import type {
  EquipmentMainCategory,
  EquipmentModel,
  EquipmentSubCategory,
} from "@/types/equipment";

export const mainCategoryService = createService<EquipmentMainCategory, "category_id">(
  "equipment_main_category",
  { primaryKey: "category_id" },
);

export const subCategoryService = createService<EquipmentSubCategory, "sub_category_id">(
  "equipment_sub_category",
  { primaryKey: "sub_category_id" },
);

export const equipmentModelService = createService<EquipmentModel, "model_id">(
  "equipment_model",
  { primaryKey: "model_id" },
);
