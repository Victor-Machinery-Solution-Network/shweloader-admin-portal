"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePusher } from "@/components/providers/pusher-provider";
import { usePermissions } from "@/components/providers/permissions-provider";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/actions/notification";
import {
  getUnreadChatSessions,
  markSessionRead,
} from "@/lib/actions/chat";
import { CHAT_SESSION_READ_EVENT } from "@/hooks/use-chat";
import type { Notification } from "@/types/notification";

// ─── Unified feed item types ───────────────────────────────────────────────

export interface ChatAlertItem {
  kind: "chat";
  id: string;
  sessionId: number;
  userName: string;
  preview: string;
  unreadCount: number;
  at: string;
}

export interface NotificationItem {
  kind: "notification";
  data: Notification;
  at: string;
}

export type FeedItem = ChatAlertItem | NotificationItem;

// ─── Helpers ───────────────────────────────────────────────────────────────

type RawChatSession = {
  id: number;
  user_name: string;
  preview: string;
  last_message_at: string;
  unread_count: number;
};

function toAlerts(sessions: RawChatSession[]): ChatAlertItem[] {
  return sessions.map((s) => ({
    kind: "chat" as const,
    id: `chat-${s.id}`,
    sessionId: s.id,
    userName: s.user_name,
    preview: s.preview || "No messages yet",
    unreadCount: s.unread_count,
    at: s.last_message_at,
  }));
}

function parseTime(dateStr: string): number {
  const normalized = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : dateStr + "Z";
  return new Date(normalized).getTime();
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatAlerts, setChatAlerts] = useState<ChatAlertItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { subscribe, subscribeAdminChat } = usePusher();
  const { permissions } = usePermissions();
  const canReadChat = permissions.includes("chat:read");
  const mountedRef = useRef(true);
  // Keep a ref to the latest pathname for Pusher callbacks that read it
  // without re-binding subscriptions on every navigation.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const isOnChatPage = pathname.startsWith("/chat");

  // Derive unread count from fetched notifications (no separate DB query needed)
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.is_read === 0).length,
    [notifications],
  );

  // Chat alerts only count as unread when not on chat page
  const chatUnread = useMemo(
    () => isOnChatPage ? 0 : chatAlerts.reduce((sum, a) => sum + a.unreadCount, 0),
    [chatAlerts, isOnChatPage],
  );

  // Debounced refresh to coalesce rapid Pusher events into a single DB query
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear debounce timer on unmount to avoid stale server action calls
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const refreshChat = useCallback(() => {
    if (!canReadChat) return;
    // On chat page: mark all alerts as read but keep them visible
    if (pathnameRef.current.startsWith("/chat")) {
      setChatAlerts((prev) => prev.map((a) => ({ ...a, unreadCount: 0 })));
      return;
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      getUnreadChatSessions().then((sessions) => {
        if (!mountedRef.current) return;
        const fresh = toAlerts(sessions);
        setChatAlerts((prev) => {
          const freshMap = new Map(fresh.map((a) => [a.sessionId, a]));
          const updated = prev.map((a) => freshMap.get(a.sessionId) ?? a);
          const existingIds = new Set(prev.map((a) => a.sessionId));
          const newAlerts = fresh.filter((a) => !existingIds.has(a.sessionId));
          return [...newAlerts, ...updated];
        });
      });
    }, 400);
  }, [canReadChat]);

  // Mark alerts as read when on chat page; refresh when leaving.
  // Effect-shaped because the false branch triggers async refreshes + timer.
  useEffect(() => {
    if (isOnChatPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChatAlerts((prev) => prev.map((a) => ({ ...a, unreadCount: 0 })));
    } else {
      // Refresh when leaving — fetch immediately + again after delay for markSessionRead to complete
      refreshChat();
      const timer = setTimeout(() => refreshChat(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnChatPage, refreshChat]);

  // Listen for chat-read events dispatched by the chat page — mark alerts as read
  useEffect(() => {
    function handleChatRead() {
      // Mark all chat alerts as read (unreadCount → 0) but keep them visible
      setChatAlerts((prev) => prev.map((a) => ({ ...a, unreadCount: 0 })));
    }
    window.addEventListener(CHAT_SESSION_READ_EVENT, handleChatRead);
    return () => window.removeEventListener(CHAT_SESSION_READ_EVENT, handleChatRead);
  }, []);

  // Unified feed: all chat alerts (read and unread) merged with notifications
  const feedItems = useMemo<FeedItem[]>(() => {
    const notifItems: FeedItem[] = notifications.map((n) => ({
      kind: "notification" as const,
      data: n,
      at: n.created_at,
    }));
    const allItems: FeedItem[] = [...notifItems, ...chatAlerts];
    allItems.sort((a, b) => parseTime(b.at) - parseTime(a.at));
    return allItems;
  }, [notifications, chatAlerts]);

  // Initial fetch — swallow per-stream failures so one stream can't break the bell
  useEffect(() => {
    mountedRef.current = true;
    const notifsPromise = getMyNotifications().catch(() => [] as Notification[]);
    const sessionsPromise = canReadChat
      ? getUnreadChatSessions().catch(() => [] as RawChatSession[])
      : Promise.resolve([] as RawChatSession[]);
    Promise.all([notifsPromise, sessionsPromise]).then(([notifs, sessions]) => {
      if (!mountedRef.current) return;
      setNotifications(notifs);
      // Only set chat alerts if not on chat page
      if (canReadChat && !pathnameRef.current.startsWith("/chat")) {
        setChatAlerts(toAlerts(sessions));
      }
      setIsLoaded(true);
    });
    return () => {
      mountedRef.current = false;
    };
  }, [canReadChat]);

  // Real-time: article/listing notifications via user's private channel
  useEffect(() => {
    const unsubscribe = subscribe("new-notification", () => {
      getMyNotifications()
        .then((notifs) => {
          if (!mountedRef.current) return;
          setNotifications(notifs);
        })
        .catch(() => {});
      router.refresh();
    });
    return unsubscribe;
  }, [subscribe, router]);

  // Real-time: chat notifications via admin chat channel
  useEffect(() => {
    if (!canReadChat) return;
    const unsubNewSession = subscribeAdminChat("new-session", () => {
      refreshChat();
    });

    const unsubNewMessage = subscribeAdminChat("new-message", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      if (raw.senderType !== "admin") {
        refreshChat();
      }
    });

    const unsubResolved = subscribeAdminChat("session-resolved", () => {
      refreshChat();
    });

    return () => {
      unsubNewSession();
      unsubNewMessage();
      unsubResolved();
    };
  }, [canReadChat, subscribeAdminChat, refreshChat]);

  const markRead = useCallback(async (notificationId: number) => {
    const result = await markNotificationRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: 1 } : n,
        ),
      );
    }
  }, []);

  const markChatRead = useCallback(async (sessionId: number) => {
    if (!canReadChat) return;
    await markSessionRead(sessionId).catch(() => {});
    setChatAlerts((prev) =>
      prev.map((a) =>
        a.sessionId === sessionId ? { ...a, unreadCount: 0 } : a,
      ),
    );
  }, [canReadChat]);

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    }
    if (canReadChat) {
      await Promise.all(
        chatAlerts
          .filter((a) => a.unreadCount > 0)
          .map((a) => markSessionRead(a.sessionId).catch(() => {})),
      );
      setChatAlerts((prev) => prev.map((a) => ({ ...a, unreadCount: 0 })));
    }
  }, [canReadChat, chatAlerts]);

  const remove = useCallback(async (notificationId: number) => {
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId),
      );
    }
  }, []);

  return {
    feedItems,
    unreadCount,
    chatUnread,
    isLoaded,
    markRead,
    markChatRead,
    markAllRead,
    remove,
  };
}
