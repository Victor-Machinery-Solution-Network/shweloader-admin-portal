"use client";

import { FileText, Check, CheckCheck } from "lucide-react";
import { assetUrl } from "@/lib/r2-url";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatFileSize } from "@/lib/utils";
import { format } from "date-fns";
import { ProductMessageCard } from "./product-message-card";
import type { ChatMessageWithDetails } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessageWithDetails;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isGrouped?: boolean; // true if this message continues a group from the same sender
  userLastReadAt?: string | null;
  isLastAdminMessage?: boolean; // only show sent/seen on the very last admin message
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  try {
    const date = dateStr.endsWith("Z") ? new Date(dateStr) : new Date(dateStr + "Z");
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

function isSeen(messageCreatedAt: string, userLastReadAt: string): boolean {
  const msgDate = messageCreatedAt.endsWith("Z")
    ? new Date(messageCreatedAt)
    : new Date(messageCreatedAt + "Z");
  const readDate = userLastReadAt.endsWith("Z")
    ? new Date(userLastReadAt)
    : new Date(userLastReadAt + "Z");
  return msgDate <= readDate;
}

export function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
  isGrouped = false,
  userLastReadAt = null,
  isLastAdminMessage = false,
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

  const hasProductRef = message.sale_listing_id || message.rent_listing_id;

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
        /* Invisible spacer to keep alignment (must match Avatar size="sm" = size-6) */
        <div className="size-6 shrink-0" />
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
                href={assetUrl(att.file_url) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
              >
                <img
                  src={assetUrl(att.file_url) ?? undefined}
                  alt={att.file_name}
                  className="object-cover max-h-37.5 w-auto"
                />
              </a>
            ))}
          </div>
        )}

        {/* PDF/file attachments */}
        {fileAttachments.map((att) => (
          <a
            key={att.id}
            href={assetUrl(att.file_url) ?? undefined}
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

        {/* Product reference card */}
        {hasProductRef && (
          <ProductMessageCard
            productName={message.product_name}
            productThumbnail={message.product_thumbnail}
            listingType={message.listing_type}
            listingId={message.sale_listing_id ?? message.rent_listing_id}
            brandName={message.brand_name}
            mmkPrice={message.mmk_price}
            usdPrice={message.usd_price}
            displayCurrency={message.display_currency}
          />
        )}

        {/* Timestamp + sent/seen ticks — only on last message in a consecutive group */}
        {showTimestamp && timestamp && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground px-1">
            {timestamp}
            {isAdminMessage && isLastAdminMessage && (
              userLastReadAt && isSeen(message.created_at, userLastReadAt) ? (
                <CheckCheck className="size-3.5 text-blue-500" />
              ) : (
                <Check className="size-3.5 text-muted-foreground" />
              )
            )}
          </span>
        )}
      </div>
    </div>
  );
}
