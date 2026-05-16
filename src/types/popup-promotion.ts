export type PopupTriggerType = "screen_entry" | "scroll";
export type PopupTargetScreen = "home" | "browse" | "subcategory";

export interface PopupPromotion {
  popup_promotion_id: number;
  name: string;
  active: 0 | 1;

  image_url: string | null;
  image_thumb_url: string | null;
  image_id: number;
  cta_label: string | null;

  target_screens: PopupTargetScreen[];

  trigger_type: PopupTriggerType;
  trigger_delay_seconds: number;
  trigger_scroll_percent: number;

  linked_listing_ids: number[];

  start_at: string | null;
  end_at: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ListingOption {
  listing_id: number;
  title: string;
  brand_name: string | null;
  model_name: string | null;
  thumb_url: string | null;
  custom_id: string | null;
  price_mmk: number | null;
  price_usd: number | null;
  listing_type: "sale" | "rent" | null;
}

export const TARGET_SCREEN_LABELS: Record<PopupTargetScreen, string> = {
  home: "Home",
  browse: "Browse",
  subcategory: "Subcategory",
};

export const TRIGGER_LABELS: Record<PopupTriggerType, string> = {
  screen_entry: "On screen entry",
  scroll: "On scroll",
};
