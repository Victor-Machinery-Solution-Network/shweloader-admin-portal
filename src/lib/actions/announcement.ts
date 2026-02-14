"use server";

import { announcementTextService } from "@/lib/services/announcement";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";

// ─── Announcement Text Actions ──────────────────────────────────────────────

export async function createAnnouncement(formData: FormData) {
  const text = formData.get("text") as string;

  if (!text?.trim()) {
    return { success: false, error: "Announcement text is required" };
  }

  try {
    const created_by = await getCurrentUserId();

    // Get current max display_order
    const { results: maxOrder } = await d1.query<{ max_order: number | null }>(
      "SELECT MAX(CAST(display_order AS INTEGER)) as max_order FROM announcement_text",
    );
    const nextOrder = (maxOrder[0]?.max_order ?? 0) + 1;

    await announcementTextService.create({
      text: text.trim(),
      is_active: 1,
      created_by,
      display_order: String(nextOrder),
    });
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create announcement"),
    };
  }
}

export async function updateAnnouncement(id: number, formData: FormData) {
  const text = formData.get("text") as string;

  if (!text?.trim()) {
    return { success: false, error: "Announcement text is required" };
  }

  try {
    await announcementTextService.update(id, { text: text.trim() });
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update announcement"),
    };
  }
}

export async function deleteAnnouncement(id: number) {
  try {
    await announcementTextService.delete(id);
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete announcement"),
    };
  }
}

export async function deleteAnnouncements(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => announcementTextService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete announcement ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function toggleAnnouncementActive(id: number) {
  try {
    await d1.query(
      "UPDATE announcement_text SET is_active = 1 - is_active WHERE announcement_id = ?",
      [id],
    );
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle announcement"),
    };
  }
}

export async function reorderAnnouncements(orderedIds: number[]) {
  try {
    const cases = orderedIds
      .map((id, i) => `WHEN ${id} THEN '${i + 1}'`)
      .join(" ");
    const idList = orderedIds.join(", ");
    await d1.query(
      `UPDATE announcement_text SET display_order = CASE announcement_id ${cases} END WHERE announcement_id IN (${idList})`,
    );
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reorder announcements"),
    };
  }
}
