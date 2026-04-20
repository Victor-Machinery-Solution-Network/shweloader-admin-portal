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
  CONTACT_EMAIL_INFO: "contact_email_info",
  CONTACT_EMAIL_SUPPORT: "contact_email_support",
  CONTACT_EMAIL_SALES: "contact_email_sales",
  CONTACT_EMAIL_PRIVACY: "contact_email_privacy",
  CHAT_WELCOME_ADMIN_ID: "chat_welcome_admin_id",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
