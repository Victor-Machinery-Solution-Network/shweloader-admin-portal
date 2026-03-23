"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePusher } from "@/components/providers/pusher-provider";
import {
  getChatMessages,
  getChatSessionById,
  markSessionRead,
  getTotalUnreadCount,
  sendTypingEvent,
} from "@/lib/actions/chat";
import type { ChatMessageWithDetails, ChatSessionWithDetails } from "@/types/chat";

/** Hook for real-time messages in an active chat session */
export function useChatMessages(sessionId: number | null, initialUnreadCount = 0, initialUserLastReadAt: string | null = null) {
  const [messages, setMessages] = useState<ChatMessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [userLastReadAt, setUserLastReadAt] = useState<string | null>(initialUserLastReadAt);
  const { subscribeToChannel } = usePusher();
  const mountedRef = useRef(true);
  const initialUnreadRef = useRef(initialUnreadCount);
  initialUnreadRef.current = initialUnreadCount;

  // Fetch messages on session change (only when sessionId changes)
  useEffect(() => {
    mountedRef.current = true;
    setSessionClosed(false);
    setUserLastReadAt(initialUserLastReadAt);
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
    if (initialUnreadRef.current > 0) {
      markSessionRead(sessionId).catch(() => {});
    }

    return () => {
      mountedRef.current = false;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pusher subscription for new messages
  useEffect(() => {
    if (!sessionId) return;

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
        markSessionRead(sessionId).catch(() => {});
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
  }, [sessionId, subscribeToChannel]);

  return { messages, isLoading, setMessages, sessionClosed, userLastReadAt };
}

/** Hook for typing indicator — tracks when a user is typing */
export function useTypingIndicator(sessionId: number | null) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const { subscribeToChannel } = usePusher();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsTyping(false);
      setTypingUser(null);
      return;
    }

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
  }, [sessionId, subscribeToChannel]);

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
  const onNewSessionRef = useRef(onNewSession);
  onNewSessionRef.current = onNewSession;
  const onSessionUpdateRef = useRef(onSessionUpdate);
  onSessionUpdateRef.current = onSessionUpdate;
  const onSessionResolvedRef = useRef(onSessionResolved);
  onSessionResolvedRef.current = onSessionResolved;
  const onSessionReopenedRef = useRef(onSessionReopened);
  onSessionReopenedRef.current = onSessionReopened;

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
        onNewSessionRef.current?.(session);
      });
      getTotalUnreadCount().then((count) => {
        if (mountedRef.current) setTotalUnread(count);
      });
    });

    // Listen for messages on existing sessions to update inbox (unread counts, preview)
    const unsubMessage = handle.subscribe("new-message", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      const isUserMessage = raw.senderType === "user";
      // Refresh unread count only for user messages
      if (isUserMessage) {
        getTotalUnreadCount().then((count) => {
          if (mountedRef.current) setTotalUnread(count);
        });
      }
      // Always update preview, but pass sender type so inbox can decide on unread badge
      onSessionUpdateRef.current?.(
        raw.sessionId as number,
        raw.lastMessagePreview as string,
        raw.lastMessageAt as string,
        isUserMessage,
      );
    });

    // Listen for session resolved to update sidebar
    const unsubResolved = handle.subscribe("session-resolved", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      onSessionResolvedRef.current?.(raw.sessionId as number);
    });

    // Listen for session-reopened to update sidebar
    const unsubReopened = handle.subscribe("session-reopened", (data: unknown) => {
      const raw = data as Record<string, unknown>;
      onSessionReopenedRef.current?.(raw.sessionId as number);
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
