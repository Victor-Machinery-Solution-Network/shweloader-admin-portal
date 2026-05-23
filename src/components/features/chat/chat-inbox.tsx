"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SessionList } from "./session-list";
import { ConversationPanel } from "./conversation-panel";
import { ContextPanel } from "./context-panel";
import { useChatInbox, markReadAndNotify } from "@/hooks/use-chat";
import { getSessionProducts, getChatSessionById } from "@/lib/actions/chat";
import type { ChatSessionWithDetails, ProductDiscussed } from "@/types/chat";
import { useAdminPresence } from "@/hooks/use-admin-presence";

interface ChatInboxProps {
  sessions: ChatSessionWithDetails[];
}

export function ChatInbox({ sessions: initialSessions }: ChatInboxProps) {
  useAdminPresence(); // broadcast admin presence while on chat page

  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState(initialSessions);

  // Select session from URL query param (?session=123) or default to first
  const sessionParam = searchParams.get("session");
  const initialSelectedId = sessionParam
    ? (initialSessions.some((s) => s.id === Number(sessionParam)) ? Number(sessionParam) : initialSessions[0]?.id ?? null)
    : (initialSessions[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
  // Keep a ref to the latest selectedId for external callbacks (Pusher events)
  // that need to see the current value without re-binding when it changes.
  // Updated in an effect rather than during render — see react-hooks/refs rule.
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  const [sessionProducts, setSessionProducts] = useState<ProductDiscussed[]>([]);
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const pendingSessionRef = useRef<number | null>(null);

  // Update selection when URL query param changes (e.g. clicking a notification).
  // This effect coordinates state changes with server-action side effects
  // (markReadAndNotify) and ref writes; moving the setStates to render-time would
  // pull those side effects into render too, which is wrong.
  useEffect(() => {
    if (!sessionParam) return;
    const id = Number(sessionParam);
    if (id && sessions.some((s) => s.id === id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(id);
      pendingSessionRef.current = null;
      // Mark as read in DB + notify bell, then clear badge locally
      const session = sessions.find((s) => s.id === id);
      if (session && session.unread_admin_count > 0) {
        markReadAndNotify(id);
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, unread_admin_count: 0 } : s)),
      );
    } else if (id) {
      // Session not in list yet — fetch it directly from the server
      pendingSessionRef.current = id;
      getChatSessionById(id).then((fetched) => {
        if (!fetched) return;
        setSessions((prev) =>
          prev.some((s) => s.id === id) ? prev : [fetched, ...prev],
        );
        setSelectedId(id);
        pendingSessionRef.current = null;
        if (fetched.unread_admin_count > 0) {
          markReadAndNotify(id);
        }
      });
    }
  }, [sessionParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve pending session selection when the session arrives via Pusher
  useEffect(() => {
    const pending = pendingSessionRef.current;
    if (!pending) return;
    const session = sessions.find((s) => s.id === pending);
    if (session) {
      pendingSessionRef.current = null;
      setSelectedId(pending);
      if (session.unread_admin_count > 0) {
        markReadAndNotify(pending);
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === pending ? { ...s, unread_admin_count: 0 } : s)),
      );
    }
  }, [sessions]);
  const handleSessionUpdate = useCallback(
    (sessionId: number, preview: string, at: string, isUserMessage: boolean) => {
      // If the admin is currently viewing this session, the use-chat hook will
      // auto-mark it as read via markReadAndNotify the moment the message arrives.
      // Incrementing unread_admin_count here would create a stale React state
      // that disagrees with the DB and leaves the unread badge visible until
      // the admin navigates away and back.
      const isCurrentlyViewing = sessionId === selectedIdRef.current;

      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === sessionId);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          last_message_preview: preview,
          last_message_at: at,
          unread_admin_count:
            isUserMessage && !isCurrentlyViewing
              ? prev[idx].unread_admin_count + 1
              : prev[idx].unread_admin_count,
        };
        // Move to top — most recent message goes first
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
      // Re-fetch products if a new message arrived for the selected session
      if (isCurrentlyViewing) {
        setProductRefreshKey((k) => k + 1);
      }
    },
    [],
  );

  // Clear unread badge for the currently viewed session
  const handleMessagesRead = useCallback(() => {
    if (!selectedId) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedId ? { ...s, unread_admin_count: 0 } : s,
      ),
    );
  }, [selectedId]);

  const handleSessionResolved = useCallback((sessionId: number) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: "resolved" as const, unread_admin_count: 0 }
          : s,
      ),
    );
  }, []);

  const handleSessionReopened = useCallback((sessionId: number) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: "active" as const }
          : s,
      ),
    );
  }, []);

  const handleNewSession = useCallback((session: ChatSessionWithDetails) => {
    setSessions((prev) =>
      prev.some((s) => s.id === session.id) ? prev : [session, ...prev],
    );
  }, []);

  useChatInbox(handleNewSession, handleSessionUpdate, handleSessionResolved, handleSessionReopened);

  const selectedSession =
    sessions.find((s) => s.id === selectedId) ?? null;

  // Clear products immediately when no session is selected — prev-state pattern.
  const [prevSelectedForProducts, setPrevSelectedForProducts] = useState(selectedId);
  if (prevSelectedForProducts !== selectedId) {
    setPrevSelectedForProducts(selectedId);
    if (!selectedId) setSessionProducts([]);
  }

  // Fetch products discussed for the selected session (re-fetches on new messages)
  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    getSessionProducts(selectedId).then((products) => {
      if (!cancelled) {
        setSessionProducts(products);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId, productRefreshKey]);

  function handleSelect(id: number) {
    // Sync the ref synchronously here so any Pusher event firing between the
    // click and the effect-commit phase sees the correct selected session.
    // The effect on line 33 keeps it in sync for non-click selection changes.
    selectedIdRef.current = id;
    setSelectedId(id);
    // Clear unread badge locally and mark as read in DB + notify bell
    const session = sessions.find((s) => s.id === id);
    if (session && session.unread_admin_count > 0) {
      markReadAndNotify(id);
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, unread_admin_count: 0 } : s,
      ),
    );
  }

  const handleSessionClosed = useCallback(() => {
    if (!selectedId) return;
    handleSessionResolved(selectedId);
  }, [selectedId, handleSessionResolved]);

  return (
    <div className="flex flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-background">
      {/* Left panel: session list */}
      <div className="w-[340px] shrink-0 border-r border-border flex flex-col min-h-0">
        <SessionList
          sessions={sessions}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Center panel: conversation */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <ConversationPanel
          session={selectedSession}
          onSessionClosed={handleSessionClosed}
          onSessionReopened={() => selectedId && handleSessionReopened(selectedId)}
          onMessagesRead={handleMessagesRead}
        />
      </div>

      {/* Right panel: context */}
      {selectedSession && (
        <ContextPanel
          session={selectedSession}
          products={sessionProducts}

        />
      )}
    </div>
  );
}
