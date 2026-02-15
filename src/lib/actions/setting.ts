"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import type { AppSetting } from "@/types/setting";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/** Get all settings as a key-value record */
export async function getAllSettings(): Promise<Record<string, string>> {
  const result = await d1.query<AppSetting>(
    "SELECT setting_key, value FROM app_setting ORDER BY setting_key ASC",
  );
  const map: Record<string, string> = {};
  for (const row of result.results) {
    map[row.setting_key] = row.value;
  }
  return map;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Batch update multiple settings at once */
export async function updateSettings(
  settings: Record<string, string>,
) {
  try {
    const updatedBy = await getCurrentUserId();

    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        d1.query(
          `INSERT INTO app_setting (setting_key, value, updated_by)
           VALUES (?, ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET
             value = excluded.value,
             updated_by = excluded.updated_by`,
          [key, value, updatedBy],
        ),
      ),
    );

    invalidateTag(CACHE_TAGS.SETTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update settings"),
    };
  }
}
