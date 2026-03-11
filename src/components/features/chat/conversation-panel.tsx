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
import { sendMessage, closeSession } from "@/lib/actions/chat";
import { uploadChatAttachments } from "@/lib/actions/chat-upload";
import { cn } from "@/lib/utils";
import type { ChatSessionWithDetails } from "@/types/chat";

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

  async function handleSend(message: string, files: File[]) {
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
      const result = await closeSession(session.id);
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

  const isClosed = session.status === "closed";
  const isEnquiry = session.enquiry_id != null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{session.user_name}</span>
            {isClosed ? (
              <Badge variant="secondary">Closed</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
            {isEnquiry ? (
              <Badge variant="warning">Enquiry</Badge>
            ) : (
              <Badge variant="outline">General Support</Badge>
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

        {/* Close session button */}
        {!isClosed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isClosing}
            className="shrink-0"
          >
            <X className="size-4" />
            {isClosing ? "Closing..." : "Close Session"}
          </Button>
        )}
      </div>

      {/* Product ref card (enquiry sessions only) */}
      {isEnquiry && session.product_name && (
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
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="text-sm text-muted-foreground">
                Loading messages...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={Headset}
              title="No messages yet"
              description="Send a message to start the conversation."
              fullPage={false}
            />
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div
        className={cn(
          "shrink-0",
          isClosed && "opacity-50 pointer-events-none",
        )}
      >
        {isClosed ? (
          <div className="px-4 py-3 border-t border-border text-xs text-center text-muted-foreground">
            This session has been closed. No further messages can be sent.
          </div>
        ) : (
          <ChatInputBar onSend={handleSend} disabled={isSending} />
        )}
      </div>
    </div>
  );
}
