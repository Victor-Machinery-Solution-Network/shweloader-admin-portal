"use client";

import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ChatSessionWithDetails } from "@/types/chat";

interface SessionCardProps {
  session: ChatSessionWithDetails;
  isSelected: boolean;
  onClick: () => void;
}

export function SessionCard({ session, isSelected, onClick }: SessionCardProps) {
  const isResolved = session.status === "resolved";
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

      {/* Session type label */}
      <div className="flex items-center gap-1.5">
        {hasProductRef ? (
          <>
            <span
              className="size-1.5 rounded-full bg-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground truncate">
              Product &middot; {session.product_name}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">General Support</span>
        )}
      </div>

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
          {session.last_message_preview || "No messages yet"}
        </p>
        {unreadCount > 0 && (
          <Badge variant="default" className="shrink-0 min-w-[1.25rem] text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
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
