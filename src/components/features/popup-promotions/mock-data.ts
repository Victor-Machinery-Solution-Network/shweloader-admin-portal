import type { PopupPromotion } from "@/types/popup-promotion";
import type { PopupListingOption } from "@/lib/cache";

export const MOCK_PROMOTIONS: PopupPromotion[] = [
  {
    popup_promotion_id: 1,
    name: "Lunar New Year Sale 2026",
    active: 1,
    image_url: null,
    image_thumb_url: null,
    image_id: 0,
    cta_label: "Shop Now",
    target_screens: ["home", "browse"],
    trigger_type: "screen_entry",
    trigger_delay_seconds: 3,
    trigger_scroll_percent: 50,
    linked_listing_ids: [101, 102, 103],
    start_at: "2026-02-01T00:00",
    end_at: "2026-02-10T23:59",
    created_at: "2026-01-15T10:00:00",
    updated_at: "2026-01-15T10:00:00",
    deleted_at: null,
  },
  {
    popup_promotion_id: 2,
    name: "Monsoon Equipment Deals",
    active: 1,
    image_url: null,
    image_thumb_url: null,
    image_id: 0,
    cta_label: "View Deals",
    target_screens: ["subcategory"],
    trigger_type: "scroll",
    trigger_delay_seconds: 0,
    trigger_scroll_percent: 40,
    linked_listing_ids: [201, 202],
    start_at: "2026-05-01T00:00",
    end_at: "2026-08-31T23:59",
    created_at: "2026-04-20T10:00:00",
    updated_at: "2026-04-20T10:00:00",
    deleted_at: null,
  },
  {
    popup_promotion_id: 3,
    name: "Become a Partner",
    active: 0,
    image_url: null,
    image_thumb_url: null,
    image_id: 0,
    cta_label: "Learn More",
    target_screens: ["home", "browse", "subcategory"],
    trigger_type: "screen_entry",
    trigger_delay_seconds: 5,
    trigger_scroll_percent: 50,
    linked_listing_ids: [],
    start_at: null,
    end_at: null,
    created_at: "2026-03-10T10:00:00",
    updated_at: "2026-03-10T10:00:00",
    deleted_at: null,
  },
];

export const MOCK_LISTINGS: PopupListingOption[] = [
  { listing_id: 101, title: "CAT 320D Excavator (2018)", brand_name: "Caterpillar", model_name: "320D", thumb_url: null, custom_id: "SLE-CAT320D", price_mmk: 280000000, price_usd: null, listing_type: "sale" },
  { listing_id: 102, title: "Komatsu PC200 (2020)", brand_name: "Komatsu", model_name: "PC200", thumb_url: null, custom_id: "SLE-KOMPC200", price_mmk: 320000000, price_usd: null, listing_type: "sale" },
  { listing_id: 103, title: "Hitachi ZX240 (2019)", brand_name: "Hitachi", model_name: "ZX240", thumb_url: null, custom_id: "SLE-HITZX240", price_mmk: 290000000, price_usd: null, listing_type: "sale" },
  { listing_id: 104, title: "Volvo EC210 (2021)", brand_name: "Volvo", model_name: "EC210", thumb_url: null, custom_id: "SLE-VOLEC210", price_mmk: null, price_usd: 145000, listing_type: "rent" },
  { listing_id: 105, title: "Hyundai R220-9S (2017)", brand_name: "Hyundai", model_name: "R220-9S", thumb_url: null, custom_id: "SLE-HYUR220", price_mmk: 230000000, price_usd: null, listing_type: "sale" },
  { listing_id: 201, title: "JCB 3CX Backhoe Loader", brand_name: "JCB", model_name: "3CX", thumb_url: null, custom_id: "SLE-JCB3CX", price_mmk: 195000000, price_usd: null, listing_type: "sale" },
  { listing_id: 202, title: "Bobcat S650 Skid-Steer", brand_name: "Bobcat", model_name: "S650", thumb_url: null, custom_id: "SLE-BOBS650", price_mmk: null, price_usd: 38000, listing_type: "rent" },
  { listing_id: 203, title: "CAT 950M Wheel Loader", brand_name: "Caterpillar", model_name: "950M", thumb_url: null, custom_id: "SLE-CAT950M", price_mmk: 410000000, price_usd: null, listing_type: "sale" },
  { listing_id: 204, title: "Komatsu D65 Bulldozer", brand_name: "Komatsu", model_name: "D65", thumb_url: null, custom_id: "SLE-KOMD65", price_mmk: 360000000, price_usd: null, listing_type: "sale" },
  { listing_id: 205, title: "Sany SY215C Excavator", brand_name: "Sany", model_name: "SY215C", thumb_url: null, custom_id: "SLE-SNYSY215", price_mmk: 240000000, price_usd: null, listing_type: "sale" },
];

export function findMockPromotion(id: number): PopupPromotion | undefined {
  return MOCK_PROMOTIONS.find((p) => p.popup_promotion_id === id);
}
