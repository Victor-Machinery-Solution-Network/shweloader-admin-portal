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

function formatPreview(
  preview: string | null,
  senderType: "user" | "admin" | "system" | null,
): string {
  if (!preview) return "No messages yet";
  let text: string;
  if (preview.startsWith("[Attachment]")) text = "Sent a photo";
  else if (preview === "[Product Reference]") text = "Shared a listing";
  else text = preview;
  // Prefix "You:" when the most recent message was sent by the admin (us).
  return senderType === "admin" ? `You: ${text}` : text;
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
        "w-full text-left px-4 py-3 flex items-center gap-3 border-l-2 transition-colors",
        isSelected
          ? "border-l-transparent bg-primary/10 hover:bg-primary/15"
          : hasUnread
            ? "border-l-primary"
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
        {/* Top row: name (+ NEW badge for unread) + time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "text-sm font-medium truncate min-w-0",
                hasUnread && !isSelected
                  ? "text-foreground"
                  : "text-foreground/80",
              )}
            >
              {session.user_name}
            </span>
            {hasUnread && (
              <Badge
                variant="destructive"
                className="h-4 px-1.5 text-[10px] font-semibold shrink-0"
              >
                NEW
              </Badge>
            )}
          </div>
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
            {formatPreview(
              session.last_message_preview,
              session.last_message_sender_type,
            )}
          </p>
          {/* Unread is signalled by the red NEW badge next to the name (above),
              so the bottom row no longer repeats a count or a pending NEW. */}
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
