"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SessionList } from "./session-list";
import { ConversationPanel } from "./conversation-panel";
import { ContextPanel } from "./context-panel";
import { useChatInbox } from "@/hooks/use-chat";
import { getSessionProducts } from "@/lib/actions/chat";
import type { ChatSessionWithDetails, ProductDiscussed } from "@/types/chat";

interface ChatInboxProps {
  sessions: ChatSessionWithDetails[];
}

export function ChatInbox({ sessions: initialSessions }: ChatInboxProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialSessions[0]?.id ?? null,
  );
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [sessionProducts, setSessionProducts] = useState<ProductDiscussed[]>([]);
  const handleSessionUpdate = useCallback(
    (sessionId: number, preview: string, at: string, isUserMessage: boolean) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                last_message_preview: preview,
                last_message_at: at,
                // Only increment unread badge for user messages, not admin's own
                unread_admin_count: isUserMessage
                  ? s.unread_admin_count + 1
                  : s.unread_admin_count,
              }
            : s,
        ),
      );
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

  // Fetch products discussed for the selected session
  useEffect(() => {
    if (!selectedId) {
      setSessionProducts([]);
      return;
    }

    let cancelled = false;
    getSessionProducts(selectedId).then((products) => {
      if (!cancelled) {
        setSessionProducts(products);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function handleSelect(id: number) {
    setSelectedId(id);
    // Clear unread badge locally when selecting a session
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, unread_admin_count: 0 } : s,
      ),
    );
  }

  function handleSessionClosed() {
    if (!selectedId) return;
    handleSessionResolved(selectedId);
  }

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
