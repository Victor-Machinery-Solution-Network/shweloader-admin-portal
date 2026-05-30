"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { auditLog } from "@/lib/actions/audit";
import type { AppFeedbackWithUser } from "@/types/feedback";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/**
 * All Help & Support feedback submissions, newest first, with the submitting
 * user's contact details LEFT JOINed in. Anonymous feedback (app_user_id NULL)
 * comes back with null user fields.
 *
 * No `requirePermission` here — this function runs inside `use cache` and
 * `auth()` would touch `headers()`, which Cache Components forbid. The
 * PermissionGate wrapping the page is what gates access.
 */
export async function getFeedbackWithDetails(): Promise<AppFeedbackWithUser[]> {
  const result = await d1.query<AppFeedbackWithUser>(
    `SELECT
        af.*,
        au.full_name AS user_name,
        au.email     AS user_email,
        au.phone     AS user_phone
      FROM app_feedback af
      LEFT JOIN app_user au ON au.app_user_id = af.app_user_id
      ORDER BY af.created_at DESC`,
  );

  return result.results;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function deleteFeedback(id: number) {
  try {
    const adminId = await requirePermission("feedback", "delete");
    await d1.delete("app_feedback", id);
    invalidateTag(CACHE_TAGS.FEEDBACK);
    auditLog(adminId, `deleted feedback | id=${id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete feedback"),
    };
  }
}
