import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPusher } from "@/lib/pusher";

/**
 * Pusher private channel auth endpoint.
 * Verifies the session and checks that the requested channel matches the user.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Authorize based on channel pattern
  if (channelName === `private-user-${session.user.id}`) {
    // Existing: user's notification channel
  } else if (channelName.startsWith("private-chat-")) {
    // Chat session channel — any admin with chat:read
    if (!session.user.permissions?.includes("chat:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName === "private-admin-chat") {
    // Admin chat inbox channel
    if (!session.user.permissions?.includes("chat:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pusher = getPusher();
  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
