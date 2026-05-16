import { createService } from "@/lib/api/create-service";
import type { PopupPromotion } from "@/types/popup-promotion";

export const popupPromotionService = createService<PopupPromotion, "popup_promotion_id">(
  "popup_promotion",
  { primaryKey: "popup_promotion_id", softDelete: true },
);
