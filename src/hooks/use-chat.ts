"use client";

import { useEffect, useEffectEvent, useRef, useState, useCallback, useTransition } from "react";
import { usePusher } from "@/components/providers/pusher-provider";
import {
  getChatMessages,
  getChatSessionById,
  markSessionRead,
  getTotalUnreadCount,
  sendTypingEvent,
} from "@/lib/actions/chat";
import type { ChatMessageWithDetails, ChatSessionWithDetails } from "@/types/chat";

/** Custom event name dispatched when an admin reads a chat session */
export const CHAT_SESSION_READ_EVENT = "chat-session-read";

/** Mark session as read and notify the bell to refresh */
export function markReadAndNotify(sessionId: number) {
  markSessionRead(sessionId)
    .then(() => {
      window.dispatchEvent(new Event(CHAT_SESSION_READ_EVENT));
    })
    .catch(() => {});
}

/** Hook for real-time messages in an active chat session */
export function useChatMessages(sessionId: number | null, initialUnreadCount = 0, initialUserLastReadAt: string | null = null) {
  const [messages, setMessages] = useState<ChatMessageWithDetails[]>([]);
  const [isLoading, startLoading] = useTransition();
  const [sessionClosed, setSessionClosed] = useState(false);
  const [userLastReadAt, setUserLastReadAt] = useState<string | null>(initialUserLastReadAt);
  const { subscribeToChannel, isReady } = usePusher();
  const mountedRef = useRef(true);

  // Reset per-session state when sessionId changes — prev-state pattern.
  const [prevSessionId, setPrevSessionId] = useState(sessionId);
  if (prevSessionId !== sessionId) {
    setPrevSessionId(sessionId);
    setSessionClosed(false);
    setUserLastReadAt(initialUserLastReadAt);
    if (!sessionId) setMessages([]);
  }

  // Fetch messages on session change (only when sessionId changes)
  useEffect(() => {
    mountedRef.current = true;
    if (!sessionId) return;

    startLoading(async () => {
      const msgs = await getChatMessages(sessionId);
      if (mountedRef.current) setMessages(msgs);
    });

    // Mark as read only if there are unread messages.
    // Closure captures the latest initialUnreadCount at effect-run time.
    if (initialUnreadCount > 0) {
      markReadAndNotify(sessionId);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pusher subscription for new messages (re-runs when Pusher becomes ready)
  useEffect(() => {
    if (!sessionId || !isReady) return;

    const handle = subscribeToChannel(`private-chat-${sessionId}`);

    const unsubMessage = handle.subscribe("new-message", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      // Normalize attachments: Pusher events use camelCase, but our types use snake_case
      const rawAttachments = (raw.attachments ?? []) as Array<Record<string, unknown>>;
      const attachments = rawAttachments.map((a) => ({
        id: (a.id as number) ?? 0,
        chat_message_id: raw.messageId as number,
        file_url: (a.file_url as string) ?? (a.fileUrl as string) ?? "",
        file_name: (a.file_name as string) ?? (a.fileName as string) ?? "",
        file_size: (a.file_size as number) ?? (a.fileSize as number) ?? 0,
        file_type: (a.file_type as string) ?? (a.fileType as string) ?? "",
        created_at: (a.created_at as string) ?? (raw.createdAt as string) ?? "",
      }));
      const msg: ChatMessageWithDetails = {
        id: raw.messageId as number,
        chat_session_id: sessionId,
        sender_type: raw.senderType as "user" | "admin",
        sender_id: raw.senderId as number,
        sender_name: (raw.senderName as string) ?? "",
        message: raw.message as string | null,
        created_at: raw.createdAt as string,
        attachments,
        sale_listing_id: (raw.saleListingId as number | null) ?? null,
        rent_listing_id: (raw.rentListingId as number | null) ?? null,
        product_name: (raw.productName as string | null) ?? null,
        product_thumbnail: (raw.productThumbnail as string | null) ?? null,
        listing_type: (raw.listingType as "sale" | "rent" | null) ?? null,
        product_list_id: (raw.productListId as number | null) ?? null,
        custom_id: (raw.customId as string | null) ?? null,
        brand_name: (raw.brandName as string | null) ?? null,
        mmk_price: (raw.mmkPrice as number | null) ?? null,
        usd_price: (raw.usdPrice as number | null) ?? null,
        display_currency: (raw.displayCurrency as string | null) ?? null,
        partner_name: (raw.partnerName as string | null) ?? null,
      };
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );

      // Auto-mark as read when a user message arrives while admin is viewing this session
      if (msg.sender_type === "user" && sessionId) {
        markReadAndNotify(sessionId);
      }
    });

    // Listen for session-resolved to update UI in real-time
    const unsubResolved = handle.subscribe("session-resolved", () => {
      setSessionClosed(true);
    });

    // Listen for session-reopened to allow messaging again
    const unsubReopened = handle.subscribe("session-reopened", () => {
      setSessionClosed(false);
    });

    // Listen for messages-read to update read receipts (user read → admin sees blue ticks)
    const unsubRead = handle.subscribe("messages-read", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      if (raw.reader_type === "user" && raw.read_at) {
        setUserLastReadAt(raw.read_at as string);
      }
    });

    return () => {
      unsubMessage();
      unsubResolved();
      unsubReopened();
      unsubRead();
      handle.unsubscribe();
    };
  }, [sessionId, subscribeToChannel, isReady]);

  return { messages, isLoading, setMessages, sessionClosed, userLastReadAt };
}

/** Hook for typing indicator — tracks when a user is typing */
export function useTypingIndicator(sessionId: number | null) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const { subscribeToChannel, isReady } = usePusher();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset typing state when the session or readiness changes — prev-state pattern.
  const [prevKey, setPrevKey] = useState({ sessionId, isReady });
  if (prevKey.sessionId !== sessionId || prevKey.isReady !== isReady) {
    setPrevKey({ sessionId, isReady });
    if (!sessionId || !isReady) {
      setIsTyping(false);
      setTypingUser(null);
    }
  }

  useEffect(() => {
    if (!sessionId || !isReady) return;

    const handle = subscribeToChannel(`private-chat-${sessionId}`);

    const unsubTyping = handle.subscribe("typing-start", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      if (raw.sender_type !== "user") return;

      setIsTyping(true);
      setTypingUser((raw.sender_name as string) ?? null);

      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Auto-clear after 1.5 seconds
      timeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingUser(null);
      }, 1500);
    });

    // Reset when user sends a message (they stopped typing)
    const unsubMessage = handle.subscribe("new-message", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      if (raw.senderType === "user") {
        setIsTyping(false);
        setTypingUser(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    });

    return () => {
      unsubTyping();
      unsubMessage();
      handle.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sessionId, subscribeToChannel, isReady]);

  return { isTyping, typingUser };
}

/** Hook to emit typing events — debounced to at most once per 1 second */
export function useSendTypingEvent(sessionId: number | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  const sendTyping = useCallback(() => {
    if (!sessionId) return;

    const now = Date.now();
    const elapsed = now - lastSentRef.current;

    if (elapsed >= 1000) {
      // Send immediately
      lastSentRef.current = now;
      sendTypingEvent(sessionId).catch(() => {});
    } else if (!timerRef.current) {
      // Schedule for later
      timerRef.current = setTimeout(() => {
        lastSentRef.current = Date.now();
        sendTypingEvent(sessionId).catch(() => {});
        timerRef.current = null;
      }, 1000 - elapsed);
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { sendTyping };
}

/** Hook for inbox-level real-time updates */
export function useChatInbox(
  onNewSession?: (session: ChatSessionWithDetails) => void,
  onSessionUpdate?: (sessionId: number, preview: string, at: string, isUserMessage: boolean) => void,
  onSessionResolved?: (sessionId: number) => void,
  onSessionReopened?: (sessionId: number) => void,
) {
  const [totalUnread, setTotalUnread] = useState(0);
  const { subscribeToChannel } = usePusher();
  const mountedRef = useRef(true);

  // useEffectEvent gives stable handlers that always see the latest props,
  // without re-running the Pusher subscription effect when props change.
  // See https://react.dev/reference/react/useEffectEvent
  const handleNewSession = useEffectEvent((session: ChatSessionWithDetails) => {
    onNewSession?.(session);
  });
  const handleSessionUpdate = useEffectEvent(
    (sessionId: number, preview: string, at: string, isUserMessage: boolean) => {
      onSessionUpdate?.(sessionId, preview, at, isUserMessage);
    },
  );
  const handleSessionResolved = useEffectEvent((sessionId: number) => {
    onSessionResolved?.(sessionId);
  });
  const handleSessionReopened = useEffectEvent((sessionId: number) => {
    onSessionReopened?.(sessionId);
  });

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

    const unsubSession = handle.subscribe("new-session", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      const sessionId = raw.sessionId as number;
      // Fetch full session details and prepend to list
      getChatSessionById(sessionId).then((session) => {
        if (!mountedRef.current || !session) return;
        handleNewSession(session);
      });
      getTotalUnreadCount().then((count) => {
        if (mountedRef.current) setTotalUnread(count);
      });
    });

    // Listen for messages on existing sessions to update inbox (unread counts, preview)
    // Also handles new sessions that arrive via message instead of new-session event
    const unsubMessage = handle.subscribe("new-message", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      const sessionId = raw.sessionId as number;
      // Worker (user messages) doesn't include senderType; admin messages explicitly set senderType: "admin"
      const isUserMessage = raw.senderType !== "admin";
      // Refresh unread count only for user messages
      if (isUserMessage) {
        getTotalUnreadCount().then((count) => {
          if (mountedRef.current) setTotalUnread(count);
        });
      }

      // If this message is for a session we don't have yet, fetch and add it
      // (handles case where new-session event was missed or not sent)
      if (raw.isNewSession || isUserMessage) {
        getChatSessionById(sessionId).then((session) => {
          if (!mountedRef.current || !session) return;
          // onNewSession will deduplicate (only adds if not already in list)
          handleNewSession(session);
        });
      }

      // Always update preview, but pass sender type so inbox can decide on unread badge
      handleSessionUpdate(
        sessionId,
        raw.lastMessagePreview as string,
        raw.lastMessageAt as string,
        isUserMessage,
      );
    });

    // Listen for session resolved to update sidebar
    const unsubResolved = handle.subscribe("session-resolved", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      handleSessionResolved(raw.sessionId as number);
    });

    // Listen for session-reopened to update sidebar
    const unsubReopened = handle.subscribe("session-reopened", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      handleSessionReopened(raw.sessionId as number);
    });

    return () => {
      unsubSession();
      unsubMessage();
      unsubResolved();
      unsubReopened();
      handle.unsubscribe();
    };
  }, [subscribeToChannel]);

  const refreshUnread = useCallback(() => {
    getTotalUnreadCount().then((count) => {
      if (mountedRef.current) setTotalUnread(count);
    });
  }, []);

  return { totalUnread, refreshUnread };
}
