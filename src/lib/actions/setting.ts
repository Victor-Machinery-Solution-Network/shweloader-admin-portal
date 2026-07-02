"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { revalidatePublicSite } from "@/lib/revalidate-public";
import { auditLog } from "@/lib/actions/audit";
import type { AppSetting } from "@/types/setting";
import { SETTING_KEYS } from "@/types/setting";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/** Get all settings as a key-value record */
export async function getAllSettings(): Promise<Record<string, string>> {
  const result = await d1.query<AppSetting>(
    "SELECT setting_key, value FROM app_setting ORDER BY setting_key ASC",
  );
  const map: Record<string, string> = {};
  for (const row of result.results) {
    map[row.setting_key] = row.value ?? "";
  }
  return map;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Batch update multiple settings at once */
export async function updateSettings(
  settings: Record<string, string>,
) {
  try {
    const updatedBy = await requirePermission("app_settings", "edit");

    // Allowlist: only known setting keys may be written. Without this, an
    // admin (or a tampered request) could inject arbitrary keys into
    // app_setting that downstream code might later read as config.
    const allowedKeys = new Set<string>(Object.values(SETTING_KEYS));
    const unknownKeys = Object.keys(settings).filter(
      (key) => !allowedKeys.has(key),
    );
    if (unknownKeys.length > 0) {
      return {
        success: false,
        error: `Unknown setting key${unknownKeys.length > 1 ? "s" : ""}: ${unknownKeys.join(", ")}`,
      };
    }

    // Validate exchange rate BEFORE persisting any setting. Otherwise a bad
    // value (0, NaN, negative, non-numeric) lands in app_setting and every
    // listing editor that loads after will see rate=0, computing mmk_price=0.
    if (SETTING_KEYS.EXCHANGE_RATE in settings) {
      const newRate = Number(settings[SETTING_KEYS.EXCHANGE_RATE]);
      if (!Number.isFinite(newRate) || newRate <= 0) {
        return {
          success: false,
          error: "Exchange rate must be a positive number",
        };
      }
    }

    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        d1.query(
          `INSERT INTO app_setting (setting_key, value, updated_by)
           VALUES (?, ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET
             value = excluded.value,
             updated_by = excluded.updated_by,
             updated_at = CURRENT_TIMESTAMP`,
          [key, value, updatedBy],
        ),
      ),
    );

    // If exchange rate changed, batch-recalculate MMK prices for system-rate listings.
    // (Validation above guarantees newRate > 0.)
    if (SETTING_KEYS.EXCHANGE_RATE in settings) {
      const newRate = Number(settings[SETTING_KEYS.EXCHANGE_RATE]);
      await Promise.all([
        d1.query(
          `UPDATE sale_listing
           SET mmk_price = CAST(usd_price * ? AS INTEGER),
               updated_at = CURRENT_TIMESTAMP
           WHERE use_system_rate = 1
             AND usd_price IS NOT NULL
             AND deleted_at IS NULL`,
          [newRate],
        ),
        d1.query(
          `UPDATE rent_listing
           SET mmk_price = CAST(usd_price * ? AS INTEGER),
               updated_at = CURRENT_TIMESTAMP
           WHERE use_system_rate = 1
             AND usd_price IS NOT NULL
             AND deleted_at IS NULL`,
          [newRate],
        ),
      ]);
      invalidateTag(CACHE_TAGS.SALE_LISTINGS);
      invalidateTag(CACHE_TAGS.RENT_LISTINGS);
      invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);
      // A rate change rewrites the MMK price on every listing, but public
      // product detail pages carry only their surgical `listing:<id>` tag —
      // the collection busts above don't reach them. Fire the platform-wide
      // detail-page tag so they don't show the old price for up to an hour.
      revalidatePublicSite(["listing-details"]);
    }

    invalidateTag(CACHE_TAGS.SETTINGS);
    auditLog(updatedBy, "updated settings | keys=" + Object.keys(settings).join(","));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update settings"),
    };
  }
}
