import { createService } from "@/lib/api/create-service";
import type { PromotionPush } from "@/types/promotion";

export const promotionPushService = createService<PromotionPush, "promotion_push_id">(
  "promotion_push",
  { primaryKey: "promotion_push_id", softDelete: true },
);
