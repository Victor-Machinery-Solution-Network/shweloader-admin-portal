"use client";

import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
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

  function handleClick() {
    if (isUnread) onRead(notification.notification_id);
    if (notification.action_url) onNavigate(notification.action_url);
  }

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent",
        isUnread && "bg-accent/50",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* Unread indicator */}
      <div className="mt-1.5 flex shrink-0 items-center">
        <div
          className={cn(
            "size-2 rounded-full",
            isUnread ? "bg-primary" : "bg-transparent",
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", isUnread && "font-medium")}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/60">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.notification_id);
            }}
            aria-label="Mark as read"
          >
            <Check className="size-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.notification_id);
          }}
          aria-label="Remove notification"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
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
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        {notifications.length > 0 ? (
          <ScrollArea className="max-h-80">
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
            <Bell className="mb-2 size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-full px-2 py-1.5 text-xs"
              onClick={() => router.push("/notifications")}
            >
              <ExternalLink className="mr-1 size-3" />
              View All
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
