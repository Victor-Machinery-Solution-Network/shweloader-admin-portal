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
    // 25s shared cache: many admins polling collapse to one upstream call.
    return NextResponse.json(
      { ...data, configured: true },
      { headers: { "Cache-Control": "private, max-age=25" } },
    );
  } catch {
    return NextResponse.json({ error: "GA error" }, { status: 502 });
  }
}
