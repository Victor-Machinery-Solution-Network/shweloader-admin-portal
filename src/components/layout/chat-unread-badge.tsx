"use client";

import { useCallback, useEffect, useState } from "react";
import { usePusher } from "@/components/providers/pusher-provider";
import { getTotalUnreadCount } from "@/lib/actions/chat";
import { CHAT_SESSION_READ_EVENT } from "@/hooks/use-chat";
import { SidebarMenuBadge } from "@/components/ui/sidebar";

/**
 * Red unread-count badge on the sidebar Chat item. Counts unread user
 * messages across pending/active sessions; live via the admin chat Pusher
 * channel and the chat-read window event.
 */
export function ChatUnreadBadge() {
  const [count, setCount] = useState(0);
  const { subscribeAdminChat } = usePusher();

  // ponytail: one COUNT query per event, no debounce — admin chat volume is
  // low; borrow the bell's 400ms debounce if it ever bursts
  const refresh = useCallback(() => {
    getTotalUnreadCount().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHAT_SESSION_READ_EVENT, refresh);
    const unsubs = [
      subscribeAdminChat("new-session", refresh),
      subscribeAdminChat("new-message", (data: unknown) => {
        const raw = data as Record<string, unknown>;
        // Only user messages increment unread_admin_count
        if (raw.senderType !== "admin" && raw.senderType !== "system") refresh();
      }),
      subscribeAdminChat("session-resolved", refresh),
    ];
    return () => {
      window.removeEventListener(CHAT_SESSION_READ_EVENT, refresh);
      unsubs.forEach((u) => u());
    };
  }, [refresh, subscribeAdminChat]);

  if (count === 0) return null;

  return (
    <SidebarMenuBadge className="min-w-5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground peer-hover/menu-button:text-destructive-foreground peer-data-active/menu-button:text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </SidebarMenuBadge>
  );
}
