import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCachedPermissionsForRole } from "@/lib/cache";
import { getRealtimeActive, gaConfigured } from "@/lib/ga/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const perms = await getCachedPermissionsForRole(session.user.role_id);
  if (!perms.includes("analytics:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!gaConfigured()) {
    return NextResponse.json({ total: 0, perMinute: [], configured: false });
  }
  try {
    const data = await getRealtimeActive();
    // Short private cache so a single tab's rapid re-polls don't each hit GA.
    return NextResponse.json(
      { ...data, configured: true },
      { headers: { "Cache-Control": "private, max-age=25" } },
    );
  } catch (e) {
    console.error("[analytics] realtime", e);
    return NextResponse.json({ error: "GA error" }, { status: 502 });
  }
}
