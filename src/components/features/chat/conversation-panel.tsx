"use client";

import { useEffect, useRef, useState } from "react";
import {
  Headset,
  MessageSquare,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageBubble } from "./message-bubble";
import { ChatInputBar } from "./chat-input-bar";
import { TypingIndicator } from "./typing-indicator";
import { useChatMessages, useTypingIndicator } from "@/hooks/use-chat";
import { sendMessage, resolveSession, reopenSession, markSessionRead } from "@/lib/actions/chat";
import { uploadChatAttachments } from "@/lib/actions/chat-upload";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import type { ChatSessionWithDetails, ChatMessageWithDetails } from "@/types/chat";

function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  // D1 stores UTC without "Z", but Pusher messages already include it
  return dateStr.endsWith("Z") ? new Date(dateStr) : new Date(dateStr + "Z");
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/** Returns true if the next message is from the same sender */
function isSameGroup(
  current: ChatMessageWithDetails,
  next: ChatMessageWithDetails | undefined,
): boolean {
  if (!next) return false;
  return current.sender_type === next.sender_type;
}

interface ConversationPanelProps {
  session: ChatSessionWithDetails | null;
  onSessionClosed: () => void;
  onMessagesRead?: () => void;
}

export function ConversationPanel({
  session,
  onSessionClosed,
  onMessagesRead,
}: ConversationPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const justSentRef = useRef(false);

  const { messages, isLoading, sessionClosed, userLastReadAt } = useChatMessages(
    session?.id ?? null,
    session?.unread_admin_count ?? 0,
    session?.user_last_read_at ?? null,
  );

  const { isTyping, typingUser } = useTypingIndicator(session?.id ?? null);

  // Derive resolved state from both session prop and real-time event
  const isResolved = session?.status === "resolved" || sessionClosed;

  // Auto-scroll only when admin sends a message (not on incoming messages)
  useEffect(() => {
    if (justSentRef.current) {
      justSentRef.current = false;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (session?.id) {
        onMessagesRead?.();
        markSessionRead(session.id).catch(() => {});
      }
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver on the bottom sentinel — when visible, user has seen latest messages
  const onMessagesReadRef = useRef(onMessagesRead);
  onMessagesReadRef.current = onMessagesRead;

  useEffect(() => {
    const sentinel = messagesEndRef.current;
    const scrollRoot = scrollAreaRef.current;
    if (!sentinel || !scrollRoot) return;

    // Find the actual Radix scroll viewport (the element that scrolls)
    const viewport = scrollRoot.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (!viewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearBottomRef.current = entry.isIntersecting;
        if (entry.isIntersecting && session?.id) {
          onMessagesReadRef.current?.();
          markSessionRead(session.id).catch(() => {});
        }
      },
      { root: viewport, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [session?.id]);

  // Auto-scroll when typing indicator appears and user was already at the bottom
  useEffect(() => {
    if (!isTyping) return;
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLElement | null;
    if (!viewport) return;
    // After the typing indicator renders, if user was near the bottom
    // the gap is roughly the indicator's height (~30-40px)
    const gap = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (gap < 100) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTyping]);

  // Handle real-time session closed event
  useEffect(() => {
    if (sessionClosed) {
      onSessionClosed();
    }
  }, [sessionClosed, onSessionClosed]);

  // Combine session's user_last_read_at with real-time updates
  const effectiveUserLastReadAt = userLastReadAt ?? session?.user_last_read_at ?? null;

  // Find the last admin message index — only show sent/seen tick on that one
  const lastAdminMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_type === "admin") return messages[i].id;
    }
    return -1;
  })();

  async function handleSend(message: string, files: File[], listing?: { id: number; type: "sale" | "rent" }) {
    if (!session || isSending) return;

    setIsSending(true);
    try {
      // Upload attachments if any
      let attachmentData: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] | undefined;
      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) formData.append("files", file);
        const uploadResult = await uploadChatAttachments(session.id, formData);
        if (!uploadResult.success) {
          console.error("Failed to upload attachments:", uploadResult.error);
          return;
        }
        attachmentData = uploadResult.attachments;
      }

      // Build listing reference if provided
      const listingRef = listing
        ? {
            saleListingId: listing.type === "sale" ? listing.id : undefined,
            rentListingId: listing.type === "rent" ? listing.id : undefined,
          }
        : undefined;

      justSentRef.current = true;
      const result = await sendMessage(session.id, message || null, attachmentData, listingRef);
      if (!result.success) {
        console.error("Failed to send message:", result.error);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleClose() {
    if (!session || isClosing) return;
    setIsClosing(true);
    try {
      const result = await resolveSession(session.id);
      if (result.success) {
        onSessionClosed();
      } else {
        console.error("Failed to close session:", result.error);
      }
    } finally {
      setIsClosing(false);
    }
  }

  async function handleReopen() {
    if (!session || isReopening) return;
    setIsReopening(true);
    try {
      const result = await reopenSession(session.id);
      if (!result.success) {
        console.error("Failed to reopen session:", result.error);
      }
      // Success: Pusher event will update UI via sessionClosed state
    } finally {
      setIsReopening(false);
    }
  }

  // No session selected
  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={MessageSquare}
          title="Select a conversation"
          description="Choose a session from the left to start chatting."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="size-9 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-semibold text-secondary-foreground">
                {session.user_name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0] ?? "")
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            {session.status === "active" && (
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{session.user_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {isResolved
                ? "Resolved"
                : session.status === "pending"
                  ? "Pending"
                  : "Active now"}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isResolved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={isReopening}
            >
              <RotateCcw className="size-4" />
              {isReopening ? "Reopening..." : "Reopen"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isClosing}
            >
              <X className="size-4" />
              {isClosing ? "Resolving..." : "Resolve Session"}
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <span className="text-sm text-muted-foreground">
            Loading messages...
          </span>
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={Headset}
          title="No messages yet"
          description="Send a message to start the conversation."
        />
      ) : (
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="flex flex-col px-4 py-4">
            {messages.map((msg, idx) => {
              const prev = messages[idx - 1];
              const next = messages[idx + 1];
              const msgDate = parseDate(msg.created_at);

              // Date separator: show when date changes between messages
              const showDateSep =
                !prev || !isSameDay(parseDate(prev.created_at), msgDate);

              // Grouping: consecutive messages from same sender
              const isLastInGroup = !isSameGroup(msg, next);
              const isFirstInGroup = !prev || prev.sender_type !== msg.sender_type;

              return (
                <div
                  key={msg.id}
                  className={cn(isFirstInGroup ? "mt-4" : "mt-1")}
                >
                  {showDateSep && <DateSeparator label={formatDateLabel(msgDate)} />}
                  <MessageBubble
                    message={msg}
                    showAvatar={isLastInGroup}
                    showTimestamp={isLastInGroup}
                    isGrouped={!isFirstInGroup}
                    userLastReadAt={effectiveUserLastReadAt}
                    isLastAdminMessage={msg.id === lastAdminMessageId}
                  />
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && typingUser && (
              <div className="mt-2">
                <TypingIndicator userName={typingUser} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Input bar / resolved footer */}
      <div className="shrink-0">
        {isResolved ? (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-3 bg-muted/30">
            <span className="text-xs text-muted-foreground">
              This session has been resolved.
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={handleReopen}
              disabled={isReopening}
            >
              <RotateCcw className="size-3" />
              {isReopening ? "Reopening..." : "Reopen"}
            </Button>
          </div>
        ) : (
          <ChatInputBar onSend={handleSend} disabled={isSending} sessionId={session?.id ?? null} />
        )}
      </div>
    </div>
  );
}
