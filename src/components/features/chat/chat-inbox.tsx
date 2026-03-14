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
  const [messageCount, setMessageCount] = useState(0);

  const handleSessionUpdate = useCallback(
    (sessionId: number, preview: string, at: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                last_message_preview: preview,
                last_message_at: at,
                unread_admin_count: s.unread_admin_count + 1,
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

  useChatInbox(handleSessionUpdate);

  const selectedSession =
    sessions.find((s) => s.id === selectedId) ?? null;

  // Fetch products discussed for the selected session
  useEffect(() => {
    if (!selectedId) {
      setSessionProducts([]);
      setMessageCount(0);
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

  const handleMessageCountChange = useCallback((count: number) => {
    setMessageCount(count);
  }, []);

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
    // After closing, keep the session selected (it will update via server refresh)
    // The conversation panel will show it as closed
  }

  return (
    <div className="flex flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-background">
      {/* Left panel: session list */}
      <div className="w-[260px] shrink-0 border-r border-border flex flex-col min-h-0">
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
          onMessageCountChange={handleMessageCountChange}
          onMessagesRead={handleMessagesRead}
        />
      </div>

      {/* Right panel: context */}
      {selectedSession && (
        <ContextPanel
          session={selectedSession}
          products={sessionProducts}
          messageCount={messageCount}
        />
      )}
    </div>
  );
}
