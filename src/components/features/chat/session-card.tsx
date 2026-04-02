"use client";

import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatSessionWithDetails } from "@/types/chat";
import { useUserPresence } from "@/hooks/use-user-presence";

interface SessionCardProps {
  session: ChatSessionWithDetails;
  isSelected: boolean;
  onClick: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
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
  const unreadCount = session.unread_admin_count;
  const hasUnread = unreadCount > 0;
  const relativeTime = session.last_message_at ? timeAgo(session.last_message_at) : "";
  const userPresence = useUserPresence(isResolved ? null : session.app_user_id);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex items-center gap-3 border-l-2 transition-colors hover:bg-muted/50",
        isSelected
          ? "border-l-primary bg-primary/10"
          : hasUnread
            ? "border-l-primary bg-primary/50"
            : isPending
              ? "border-l-primary/60"
              : "border-l-transparent",
        isResolved && "opacity-50",
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar size="sm">
          <AvatarFallback className="text-xs font-medium bg-secondary text-secondary-foreground">
            {getInitials(session.user_name)}
          </AvatarFallback>
        </Avatar>
        {userPresence.status === "online" && (
          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-[1.5px] ring-background" />
        )}
        {userPresence.status === "recently-active" && (
          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-amber-400 ring-[1.5px] ring-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Top row: name + time */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-medium truncate",
              hasUnread && !isSelected ? "text-foreground" : "text-foreground/80",
            )}
          >
            {session.user_name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {relativeTime}
          </span>
        </div>

        {/* Bottom row: preview + badges */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-xs truncate flex-1",
              hasUnread && !isSelected
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            {formatPreview(session.last_message_preview)}
          </p>
          {hasUnread && (
            <Badge variant="default" className="shrink-0 min-w-[1.25rem] text-xs bg-primary text-primary-foreground">
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
      </div>
    </button>
  );
}
