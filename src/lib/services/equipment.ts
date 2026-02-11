import { createService } from "@/lib/api";
import type {
  EquipmentMainCategory,
  EquipmentModel,
  EquipmentSubCategory,
} from "@/types/equipment";

export const mainCategoryService = createService<EquipmentMainCategory>(
  "equipment_main_category",
  { primaryKey: "category_id" },
);

export const subCategoryService = createService<EquipmentSubCategory>(
  "equipment_sub_category",
  { primaryKey: "sub_category_id" },
);

export const equipmentModelService = createService<EquipmentModel>(
  "equipment_model",
  { primaryKey: "model_id" },
);
