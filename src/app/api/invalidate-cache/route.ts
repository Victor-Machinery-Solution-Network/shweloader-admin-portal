import { NextResponse } from "next/server";
import { CACHE_TAGS } from "@/lib/constants";
import { invalidateTag } from "@/lib/cache-invalidation";

/**
 * Temporary route to invalidate caches after DB seed.
 * DELETE THIS FILE after use.
 *
 * Usage: GET /api/invalidate-cache
 */
export async function GET() {
  invalidateTag(CACHE_TAGS.ROLES);
  invalidateTag(CACHE_TAGS.PERMISSIONS);
  invalidateTag(CACHE_TAGS.FEATURE_PERMISSIONS);
  return NextResponse.json({ success: true, message: "Caches invalidated: roles, permissions, feature-permissions" });
}
