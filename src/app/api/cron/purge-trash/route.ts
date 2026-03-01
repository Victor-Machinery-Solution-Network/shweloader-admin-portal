import { NextResponse } from "next/server";
import { purgeExpiredTrash } from "@/lib/actions/trash";

/**
 * Cron endpoint: Permanently deletes trash items past their 30-day expiry.
 * Called daily at 2 AM UTC by Vercel Cron.
 *
 * Protected by CRON_SECRET environment variable — Vercel sets the
 * Authorization header automatically for cron invocations.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deleted, errors } = await purgeExpiredTrash();

    return NextResponse.json({
      success: true,
      deleted,
      errors,
      message: `Purged ${deleted} expired trash items${errors > 0 ? ` (${errors} errors)` : ""}`,
    });
  } catch (error) {
    console.error("Trash purge failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
