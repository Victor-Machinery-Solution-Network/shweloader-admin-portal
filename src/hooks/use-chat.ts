"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePusher } from "@/components/providers/pusher-provider";
import {
  getChatMessages,
  markSessionRead,
  getTotalUnreadCount,
} from "@/lib/actions/chat";
import type { ChatMessageWithDetails } from "@/types/chat";

/** Hook for real-time messages in an active chat session */
export function useChatMessages(sessionId: number | null, initialUnreadCount = 0) {
  const [messages, setMessages] = useState<ChatMessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const { subscribeToChannel } = usePusher();
  const mountedRef = useRef(true);

  // Fetch messages on session change
  useEffect(() => {
    mountedRef.current = true;
    setSessionClosed(false);
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    getChatMessages(sessionId).then((msgs) => {
      if (!mountedRef.current) return;
      setMessages(msgs);
      setIsLoading(false);
    });

    // Mark as read only if there are unread messages
    if (initialUnreadCount > 0) {
      markSessionRead(sessionId).catch(() => {});
    }

    return () => {
      mountedRef.current = false;
    };
  }, [sessionId, initialUnreadCount]);

  // Pusher subscription for new messages
  useEffect(() => {
    if (!sessionId) return;

    const handle = subscribeToChannel(`private-chat-${sessionId}`);

    const unsubMessage = handle.subscribe("new-message", (data: unknown) => {
      const msg = data as ChatMessageWithDetails & { attachments?: unknown[] };
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          attachments: (msg.attachments ?? []) as ChatMessageWithDetails["attachments"],
        },
      ]);
    });

    // Listen for session-closed to update UI in real-time
    const unsubClosed = handle.subscribe("session-closed", () => {
      setSessionClosed(true);
    });

    return () => {
      unsubMessage();
      unsubClosed();
      handle.unsubscribe();
    };
  }, [sessionId, subscribeToChannel]);

  return { messages, isLoading, setMessages, sessionClosed };
}

/** Hook for inbox-level real-time updates */
export function useChatInbox() {
  const [totalUnread, setTotalUnread] = useState(0);
  const router = useRouter();
  const { subscribeToChannel } = usePusher();
  const mountedRef = useRef(true);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    getTotalUnreadCount().then((count) => {
      if (mountedRef.current) setTotalUnread(count);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pusher subscription for inbox updates
  useEffect(() => {
    const handle = subscribeToChannel("private-admin-chat");

    const unsubSession = handle.subscribe("new-chat-session", () => {
      // Refetch unread count and refresh server components
      getTotalUnreadCount().then((count) => {
        if (mountedRef.current) setTotalUnread(count);
      });
      router.refresh();
    });

    // Listen for messages on existing sessions to update inbox (unread counts, preview)
    const unsubMessage = handle.subscribe("new-message", () => {
      getTotalUnreadCount().then((count) => {
        if (mountedRef.current) setTotalUnread(count);
      });
      router.refresh();
    });

    return () => {
      unsubSession();
      unsubMessage();
      handle.unsubscribe();
    };
  }, [subscribeToChannel, router]);

  const refreshUnread = useCallback(() => {
    getTotalUnreadCount().then((count) => {
      if (mountedRef.current) setTotalUnread(count);
    });
  }, []);

  return { totalUnread, refreshUnread };
}
