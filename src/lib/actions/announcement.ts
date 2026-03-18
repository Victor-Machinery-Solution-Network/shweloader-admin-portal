"use server";

import { announcementTextService } from "@/lib/services/announcement";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { getNextDisplayOrder } from "@/lib/actions/reorder";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

// ─── Announcement Text Actions ──────────────────────────────────────────────

export async function createAnnouncement(formData: FormData) {
  const text = formData.get("text") as string;

  if (!text?.trim()) {
    return { success: false, error: "Announcement text is required" };
  }

  try {
    const [created_by, display_order] = await Promise.all([
      requirePermission("announcements", "create"),
      getNextDisplayOrder("announcement_text"),
    ]);

    await announcementTextService.create({
      text: text.trim(),
      is_active: 1,
      created_by,
      display_order,
    });
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    auditLog(created_by, "created announcement");
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
    const userId = await requirePermission("announcements", "edit");
    await announcementTextService.update(id, { text: text.trim() });
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    auditLog(userId, "updated announcement | id=" + id);
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
    const deletedBy = await requirePermission("announcements", "delete");
    await announcementTextService.softDelete(id, deletedBy);
    saveTrashMetadata("announcement", id, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    auditLog(deletedBy, "deleted announcement | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete announcement"),
    };
  }
}

export async function deleteAnnouncements(ids: number[]) {
  const deletedBy = await requirePermission("announcements", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await announcementTextService.softDelete(id, deletedBy);
      saveTrashMetadata("announcement", id, deletedBy).catch(() => {});
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete announcement ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
  auditLog(deletedBy, "bulk deleted announcements | count=" + deleted);

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
    const userId = await requirePermission("announcements", "edit");
    await d1.query(
      "UPDATE announcement_text SET is_active = 1 - is_active WHERE announcement_id = ?",
      [id],
    );
    invalidateTag(CACHE_TAGS.ANNOUNCEMENTS);
    auditLog(userId, "toggled announcement active | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle announcement"),
    };
  }
}

