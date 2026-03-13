"use client";

import { useState } from "react";
import { SessionList } from "./session-list";
import { ConversationPanel } from "./conversation-panel";
import type { ChatSessionWithDetails } from "@/types/chat";

interface ChatInboxProps {
  sessions: ChatSessionWithDetails[];
}

export function ChatInbox({ sessions }: ChatInboxProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    sessions[0]?.id ?? null,
  );

  const selectedSession =
    sessions.find((s) => s.id === selectedId) ?? null;

  function handleSelect(id: number) {
    setSelectedId(id);
  }

  function handleSessionClosed() {
    // After closing, keep the session selected (it will update via server refresh)
    // The conversation panel will show it as closed
  }

  return (
    <div className="flex flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-background">
      {/* Left panel: session list */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col min-h-0">
        <SessionList
          sessions={sessions}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Right panel: conversation */}
      <div className="flex-1 flex flex-col min-h-0">
        <ConversationPanel
          session={selectedSession}
          onSessionClosed={handleSessionClosed}
        />
      </div>
    </div>
  );
}
