"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  X,
  FileText,
  Newspaper,
  MessageCircle,
  ChevronRight,
  CheckCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  useNotifications,
  type FeedItem,
  type ChatAlertItem,
  type NotificationItem as NotifItem,
} from "@/hooks/use-notifications";
import {
  checkNotificationItemStatus,
  type ItemStatusResult,
} from "@/lib/actions/notification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  if (type.endsWith("_submitted")) return "text-orange-600 bg-orange-100/80 dark:text-orange-400 dark:bg-orange-950/40";
  return "text-blue-600 bg-blue-100/80 dark:text-blue-400 dark:bg-blue-950/40";
}

const statusConfig = {
  Published: { icon: CheckCircle, color: "text-emerald-500", label: "approved & published" },
  Approved: { icon: CheckCircle, color: "text-emerald-500", label: "approved" },
  Rework: { icon: RotateCcw, color: "text-amber-500", label: "sent back for rework" },
  Deleted: { icon: Trash2, color: "text-red-500", label: "deleted" },
} as const;

function getStatusDisplay(status: string) {
  return statusConfig[status as keyof typeof statusConfig] ?? {
    icon: CheckCircle,
    color: "text-muted-foreground",
    label: status.toLowerCase(),
  };
}

function NotificationRow({
  item,
  onRead,
  onRemove,
  onNavigate,
}: {
  item: NotifItem;
  onRead: (id: number) => void;
  onRemove: (id: number) => void;
  onNavigate: (notification: Notification) => void;
}) {
  const notification = item.data;
  const isUnread = notification.is_read === 0;
  const Icon = getNotificationIcon(notification.type);
  const accent = getNotificationAccent(notification.type);

  function handleClick() {
    if (isUnread) onRead(notification.notification_id);
    onNavigate(notification);
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
      <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", accent)}>
        <Icon className="size-3.5" />
      </div>
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

function ChatAlertRow({
  item,
  onClick,
}: {
  item: ChatAlertItem;
  onClick: () => void;
}) {
  const isUnread = item.unreadCount > 0;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-2.5 rounded-md mx-1 px-2 py-2 transition-colors hover:bg-muted/50",
        isUnread && "bg-muted/30",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-primary bg-primary/10">
        <MessageCircle className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-[13px] leading-snug truncate", isUnread ? "font-medium" : "text-muted-foreground")}>
            {item.userName}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.unreadCount > 1 && (
              <Badge variant="default" className="min-w-5 text-[10px] bg-red-500 text-white px-1 py-0">
                {item.unreadCount}
              </Badge>
            )}
            {item.unreadCount === 1 && (
              <div className="size-1.5 rounded-full bg-primary" />
            )}
          </div>
        </div>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-1">
          sent {item.unreadCount > 1 ? `${item.unreadCount} messages` : "a message"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
          {timeAgo(item.at)}
        </p>
      </div>
    </div>
  );
}

function FeedItemRow({
  item,
  onReadNotification,
  onRemoveNotification,
  onNavigate,
  onChatClick,
}: {
  item: FeedItem;
  onReadNotification: (id: number) => void;
  onRemoveNotification: (id: number) => void;
  onNavigate: (notification: Notification) => void;
  onChatClick: (sessionId: number) => void;
}) {
  if (item.kind === "chat") {
    return <ChatAlertRow item={item} onClick={() => onChatClick(item.sessionId)} />;
  }
  return (
    <NotificationRow
      item={item}
      onRead={onReadNotification}
      onRemove={onRemoveNotification}
      onNavigate={onNavigate}
    />
  );
}

export function NotificationBell() {
  const router = useRouter();
  const {
    feedItems,
    unreadCount,
    chatUnread,
    markRead,
    markChatRead,
    markAllRead,
    remove,
  } = useNotifications();

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    status: ItemStatusResult | null;
    notification: Notification | null;
  }>({ open: false, status: null, notification: null });

  const totalBadge = unreadCount + chatUnread;
  const displayCount = totalBadge > 99 ? "99+" : totalBadge;

  function handleChatClick(sessionId: number) {
    markChatRead(sessionId);
    router.push(`/chat?session=${sessionId}`);
  }

  async function handleNotificationClick(notification: Notification) {
    // Only check status for "submitted" notifications — those can go stale
    if (notification.type.endsWith("_submitted") && notification.reference_id) {
      try {
        const result = await checkNotificationItemStatus(notification.notification_id);
        if (result.handled) {
          setStatusDialog({ open: true, status: result, notification });
          return;
        }
      } catch {
        // Status check failed — fall through to normal navigation
      }
    }
    // Not handled or not a submitted type — navigate normally
    if (notification.action_url) router.push(notification.action_url);
  }

  const statusDisplay = statusDialog.status?.status
    ? getStatusDisplay(statusDialog.status.status)
    : null;
  const StatusIcon = statusDisplay?.icon ?? CheckCircle;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${totalBadge > 0 ? ` (${totalBadge} unread)` : ""}`}
            className="relative"
          >
            <Bell
              className={cn(
                "h-4 w-4 transition-transform",
                totalBadge > 0 && "animate-[bell-shake_0.5s_ease-in-out]",
              )}
              aria-hidden="true"
            />
            {totalBadge > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {displayCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 gap-0 overflow-hidden p-0"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {totalBadge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {displayCount}
                </span>
              )}
            </div>
            {totalBadge > 0 && (
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

          {/* Content — unified feed sorted by time */}
          {feedItems.length > 0 ? (
            <div className="max-h-80 overflow-y-auto overscroll-contain py-1">
              {feedItems.map((item) => (
                <FeedItemRow
                  key={item.kind === "chat" ? item.id : `notif-${item.data.notification_id}`}
                  item={item}
                  onReadNotification={markRead}
                  onRemoveNotification={remove}
                  onNavigate={handleNotificationClick}
                  onChatClick={handleChatClick}
                />
              ))}
            </div>
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
          {feedItems.length > 0 && (
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

      {/* Already-handled dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open) setStatusDialog({ open: false, status: null, notification: null });
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className={cn("mb-2 flex size-12 items-center justify-center rounded-full",
              statusDisplay?.color === "text-emerald-500" ? "bg-emerald-100 dark:bg-emerald-950/40" :
              statusDisplay?.color === "text-amber-500" ? "bg-amber-100 dark:bg-amber-950/40" :
              "bg-red-100 dark:bg-red-950/40"
            )}>
              <StatusIcon className={cn("size-6", statusDisplay?.color)} />
            </div>
            <DialogTitle>
              Already {statusDisplay?.label}
            </DialogTitle>
            <DialogDescription className="space-y-1">
              {statusDialog.notification?.message && (
                <span className="block">
                  {statusDialog.notification.message}
                </span>
              )}
              <span className="block">
                This has already been {statusDisplay?.label}
                {statusDialog.status?.actionBy && ` by ${statusDialog.status.actionBy}`}
                {statusDialog.status?.actionAt && ` ${timeAgo(statusDialog.status.actionAt)}`}
                .
              </span>
              {statusDialog.status?.reason && (
                <span className="block mt-2 text-sm">
                  Reason: {statusDialog.status.reason}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialog({ open: false, status: null, notification: null })}
            >
              Close
            </Button>
            {statusDialog.notification?.action_url && (
              <Button
                size="sm"
                onClick={() => {
                  router.push(statusDialog.notification!.action_url!);
                  setStatusDialog({ open: false, status: null, notification: null });
                }}
              >
                View anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
