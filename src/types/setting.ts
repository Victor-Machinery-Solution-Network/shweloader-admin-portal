/** Matches the app_setting table in D1 */
export interface AppSetting {
  id: number;
  setting_key: string;
  value: string | null;
  updated_by: number | null;
  updated_at: string;
}

/** Known setting keys */
export const SETTING_KEYS = {
  CAROUSEL_ENABLED: "carousel_enabled",
  ANNOUNCEMENT_BAR_ENABLED: "announcement_bar_enabled",
  ARTICLES_ENABLED: "articles_enabled",
  EXCHANGE_RATE: "exchange_rate",
  CONTACT_PHONE: "contact_phone",
  CHAT_WELCOME_ADMIN_ID: "chat_welcome_admin_id",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
