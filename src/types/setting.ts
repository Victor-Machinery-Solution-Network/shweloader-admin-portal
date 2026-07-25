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
  // App update prompt (see docs/superpowers/specs/2026-07-25-app-update-prompt-design.md)
  IOS_LATEST_BUILD: "ios_latest_build",
  IOS_MIN_BUILD: "ios_min_build",
  ANDROID_LATEST_BUILD: "android_latest_build",
  ANDROID_MIN_BUILD: "android_min_build",
  IOS_STORE_URL: "ios_store_url",
  ANDROID_STORE_URL: "android_store_url",
  UPDATE_MESSAGE_EN: "update_message_en",
  UPDATE_MESSAGE_MY: "update_message_my",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/**
 * Keys written by systems other than the admin portal (worker crons).
 * Deliberately NOT in SETTING_KEYS so the updateSettings allowlist keeps
 * them read-only from the portal.
 */
export const READONLY_SETTING_KEYS = {
  /** Version name Apple's lookup API reports live; written by the app-api cron. */
  IOS_STORE_VERSION_NAME: "ios_store_version_name",
} as const;
