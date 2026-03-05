"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  X,
  FileText,
  Newspaper,
  ChevronRight,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification } from "@/types/notification";

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "article_submitted":
    case "article_approved":
    case "article_rework":
      return Newspaper;
    default:
      return FileText;
  }
}

function getNotificationAccent(type: Notification["type"]) {
  if (type.endsWith("_approved")) return "text-green-600 bg-green-100/80 dark:text-green-400 dark:bg-green-950/40";
  if (type.endsWith("_rework")) return "text-amber-600 bg-amber-100/80 dark:text-amber-400 dark:bg-amber-950/40";
  return "text-blue-600 bg-blue-100/80 dark:text-blue-400 dark:bg-blue-950/40";
}

function NotificationItem({
  notification,
  onRead,
  onRemove,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: number) => void;
  onRemove: (id: number) => void;
  onNavigate: (url: string) => void;
}) {
  const isUnread = notification.is_read === 0;
  const Icon = getNotificationIcon(notification.type);
  const accent = getNotificationAccent(notification.type);

  function handleClick() {
    if (isUnread) onRead(notification.notification_id);
    if (notification.action_url) onNavigate(notification.action_url);
  }

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-2.5 rounded-md mx-1 px-2 py-2 transition-colors hover:bg-muted/50",
        isUnread && "bg-muted/30",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", accent)}>
        <Icon className="size-3.5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-[13px] leading-snug", isUnread ? "font-medium" : "text-muted-foreground")}>
            {notification.title}
          </p>
          {isUnread && (
            <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        {notification.message && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Remove button on hover */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-1.5 top-1.5 size-6 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.notification_id);
        }}
        aria-label="Remove notification"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, remove } =
    useNotifications();

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className="relative"
        >
          <Bell
            className={cn(
              "h-4 w-4 transition-transform",
              unreadCount > 0 && "animate-[bell-shake_0.5s_ease-in-out]",
            )}
            aria-hidden="true"
          />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 overflow-hidden p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {displayCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        {notifications.length > 0 ? (
          <ScrollArea className="max-h-[320px]">
            <div className="py-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.notification_id}
                  notification={n}
                  onRead={markRead}
                  onRemove={remove}
                  onNavigate={(url) => router.push(url)}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <Bell className="size-4 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">All caught up</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">No new notifications</p>
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-center py-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/notifications")}
            >
              View all notifications
              <ChevronRight className="ml-1 size-3" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
