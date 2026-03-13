"use client";

import Image from "next/image";
import { FileText } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatFileSize } from "@/lib/utils";
import { format } from "date-fns";
import type { ChatMessageWithDetails } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessageWithDetails;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isGrouped?: boolean; // true if this message continues a group from the same sender
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  try {
    // D1 stores UTC without Z
    const date = new Date(dateStr + "Z");
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

export function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
  isGrouped = false,
}: MessageBubbleProps) {
  const isAdminMessage = message.sender_type === "admin";
  const initials = getInitials(message.sender_name);
  const timestamp = formatTimestamp(message.created_at);

  const imageAttachments = message.attachments.filter((a) =>
    a.file_type.startsWith("image/"),
  );
  const fileAttachments = message.attachments.filter(
    (a) => !a.file_type.startsWith("image/"),
  );

  return (
    <div
      className={cn(
        "flex gap-2 items-end",
        isAdminMessage ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar — only on last message in a consecutive group */}
      {showAvatar ? (
        <Avatar size="sm" className="shrink-0 mb-0.5">
          <AvatarFallback
            className={cn(
              "text-xs font-medium",
              isAdminMessage
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        /* Invisible spacer to keep alignment */
        <div className="size-8 shrink-0" />
      )}

      {/* Bubble */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%]",
          isAdminMessage ? "items-end" : "items-start",
        )}
      >
        {/* Image attachments */}
        {imageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {imageAttachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
              >
                <Image
                  src={att.file_url}
                  alt={att.file_name}
                  width={200}
                  height={150}
                  className="object-cover max-h-[150px] w-auto"
                  unoptimized
                />
              </a>
            ))}
          </div>
        )}

        {/* PDF/file attachments */}
        {fileAttachments.map((att) => (
          <a
            key={att.id}
            href={att.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:opacity-80 transition-opacity border",
              isAdminMessage
                ? "bg-primary text-primary-foreground border-primary/20"
                : "bg-muted border-border text-foreground",
            )}
          >
            <FileText className="size-4 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-medium text-xs">{att.file_name}</p>
              <p className="text-xs opacity-70">{formatFileSize(att.file_size)}</p>
            </div>
          </a>
        ))}

        {/* Text message */}
        {message.message && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words min-w-[3rem]",
              isAdminMessage
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm",
            )}
          >
            {message.message}
          </div>
        )}

        {/* Timestamp — only on last message in a consecutive group */}
        {showTimestamp && timestamp && (
          <span className="text-xs text-muted-foreground px-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
