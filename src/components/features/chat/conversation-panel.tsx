"use client";

import { useEffect, useRef, useState } from "react";
import {
  Phone,
  Mail,
  Building2,
  Headset,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductRefCard } from "./product-ref-card";
import { MessageBubble } from "./message-bubble";
import { ChatInputBar } from "./chat-input-bar";
import { useChatMessages } from "@/hooks/use-chat";
import { sendMessage, resolveSession } from "@/lib/actions/chat";
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
}

export function ConversationPanel({
  session,
  onSessionClosed,
}: ConversationPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sessionClosed } = useChatMessages(
    session?.id ?? null,
    session?.unread_admin_count ?? 0,
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle real-time session closed event
  useEffect(() => {
    if (sessionClosed) {
      onSessionClosed();
    }
  }, [sessionClosed, onSessionClosed]);

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

      const result = await sendMessage(session.id, message || null, attachmentData);
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

  const isResolved = session.status === "resolved";
  const hasProductRef = session.product_name != null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{session.user_name}</span>
            {isResolved ? (
              <Badge variant="secondary">Resolved</Badge>
            ) : session.status === "pending" ? (
              <Badge variant="warning">Pending</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {session.user_phone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3" />
                {session.user_phone}
              </span>
            )}
            {session.user_email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="size-3" />
                {session.user_email}
              </span>
            )}
            {session.user_company && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="size-3" />
                {session.user_company}
              </span>
            )}
          </div>
        </div>

        {/* Resolve session button */}
        {!isResolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isClosing}
            className="shrink-0"
          >
            <X className="size-4" />
            {isClosing ? "Resolving..." : "Resolve Session"}
          </Button>
        )}
      </div>

      {/* Product ref card (sessions with a product discussion) */}
      {hasProductRef && session.product_name && (
        <div className="px-4 py-3 border-b border-border bg-muted/20 shrink-0">
          <ProductRefCard
            productName={session.product_name}
            productThumbnail={session.product_thumbnail}
            listingType={session.listing_type}
            listingId={session.listing_id}
            brandName={session.brand_name}
            mmkPrice={session.mmk_price}
            usdPrice={session.usd_price}
            displayCurrency={session.display_currency}
            partnerName={session.partner_name}
          />
        </div>
      )}

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
        <ScrollArea className="flex-1 min-h-0">
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
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Input bar */}
      <div
        className={cn(
          "shrink-0",
          isResolved && "opacity-50 pointer-events-none",
        )}
      >
        {isResolved ? (
          <div className="px-4 py-3 border-t border-border text-xs text-center text-muted-foreground">
            This session has been resolved. No further messages can be sent.
          </div>
        ) : (
          <ChatInputBar onSend={handleSend} disabled={isSending} sessionId={session?.id ?? null} />
        )}
      </div>
    </div>
  );
}
