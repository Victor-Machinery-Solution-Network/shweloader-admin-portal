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

  // Only allow users to subscribe to their own private channel
  const expectedChannel = `private-user-${session.user.id}`;
  if (channelName !== expectedChannel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pusher = getPusher();
  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
