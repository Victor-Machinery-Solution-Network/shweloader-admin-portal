"use client";

import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ChatSessionWithDetails } from "@/types/chat";

interface SessionCardProps {
  session: ChatSessionWithDetails;
  isSelected: boolean;
  onClick: () => void;
}

function formatPreview(preview: string | null): string {
  if (!preview) return "No messages yet";
  if (preview.startsWith("[Attachment]")) return "Sent a photo";
  if (preview === "[Product Reference]") return "Shared a listing";
  return preview;
}

export function SessionCard({ session, isSelected, onClick }: SessionCardProps) {
  const isResolved = session.status === "resolved";
  const isPending = session.status === "pending";
  const hasProductRef = session.product_name != null;
  const unreadCount = session.unread_admin_count;
  const relativeTime = session.last_message_at ? timeAgo(session.last_message_at) : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex flex-col gap-1 border-l-2 transition-colors hover:bg-muted/50",
        isSelected
          ? "border-l-primary bg-primary/10"
          : isPending
            ? "border-l-amber-500"
            : "border-l-transparent",
        isResolved && "opacity-50",
      )}
    >
      {/* Top row: name + time */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-medium truncate",
            unreadCount > 0 && !isSelected ? "text-foreground" : "text-foreground/80",
          )}
        >
          {session.user_name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {relativeTime}
        </span>
      </div>

      {/* Product reference */}
      {hasProductRef && (
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full bg-amber-500 shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground truncate">
            Product &middot; {session.product_name}
          </span>
        </div>
      )}

      {/* Bottom row: preview + unread badge */}
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-xs truncate flex-1",
            unreadCount > 0 && !isSelected
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {formatPreview(session.last_message_preview)}
        </p>
        {unreadCount > 0 && (
          <Badge variant="default" className="shrink-0 min-w-[1.25rem] text-xs bg-red-500 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
        {isPending && (
          <Badge variant="equipment" className="shrink-0 text-xs">
            NEW
          </Badge>
        )}
        {isResolved && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            Resolved
          </Badge>
        )}
      </div>
    </button>
  );
}
