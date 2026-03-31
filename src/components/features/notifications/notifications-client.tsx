"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Package,
  MessageCircle,
  Handshake,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  useNotifications,
  type FeedItem,
  type ChatAlertItem,
  type NotificationItem as NotifItem,
} from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import type { NotificationType } from "@/types/notification";

const typeIcons: Record<NotificationType, typeof FileText> = {
  article_submitted: FileText,
  article_approved: CheckCircle,
  article_rework: XCircle,
  listing_submitted: Package,
  listing_approved: CheckCircle,
  listing_rework: XCircle,
  partner_submitted: Handshake,
};

const typeColors: Record<NotificationType, string> = {
  article_submitted: "bg-blue-500/10 text-blue-600",
  article_approved: "bg-emerald-500/10 text-emerald-600",
  article_rework: "bg-amber-500/10 text-amber-600",
  listing_submitted: "bg-indigo-500/10 text-indigo-600",
  listing_approved: "bg-emerald-500/10 text-emerald-600",
  listing_rework: "bg-amber-500/10 text-amber-600",
  partner_submitted: "bg-purple-500/10 text-purple-600",
};

function NotificationCard({
  item,
  onRead,
  onRemove,
  onNavigate,
}: {
  item: NotifItem;
  onRead: (id: number) => void;
  onRemove: (id: number) => void;
  onNavigate: (url: string) => void;
}) {
  const notification = item.data;
  const isUnread = notification.is_read === 0;
  const Icon = typeIcons[notification.type] ?? Bell;
  const iconColor = typeColors[notification.type] ?? "bg-muted text-muted-foreground";

  function handleClick() {
    if (isUnread) onRead(notification.notification_id);
    if (notification.action_url) onNavigate(notification.action_url);
  }

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent",
        isUnread && "border-primary/20 bg-primary/[0.02]",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconColor)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", isUnread && "font-medium")}>
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(notification.created_at)}
          </span>
        </div>
        {notification.message && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.notification_id);
            }}
            aria-label="Mark as read"
          >
            <Check className="size-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.notification_id);
          }}
          aria-label="Delete notification"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ChatAlertCard({
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
        "group flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent",
        isUnread && "border-primary/20 bg-primary/[0.02]",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MessageCircle className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm", isUnread && "font-medium")}>
              {item.userName}
            </p>
            {item.unreadCount > 1 && (
              <Badge variant="default" className="min-w-5 text-[10px] bg-red-500 text-white px-1 py-0">
                {item.unreadCount}
              </Badge>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(item.at)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
          {item.preview}
        </p>
      </div>
    </div>
  );
}

function FeedCard({
  item,
  onReadNotification,
  onRemoveNotification,
  onNavigate,
  onChatClick,
}: {
  item: FeedItem;
  onReadNotification: (id: number) => void;
  onRemoveNotification: (id: number) => void;
  onNavigate: (url: string) => void;
  onChatClick: (sessionId: number) => void;
}) {
  if (item.kind === "chat") {
    return <ChatAlertCard item={item} onClick={() => onChatClick(item.sessionId)} />;
  }
  return (
    <NotificationCard
      item={item}
      onRead={onReadNotification}
      onRemove={onRemoveNotification}
      onNavigate={onNavigate}
    />
  );
}

export function NotificationsClient() {
  const router = useRouter();
  const {
    feedItems,
    unreadCount,
    chatUnread,
    isLoaded,
    markRead,
    markChatRead,
    markAllRead,
    remove,
  } = useNotifications();

  const totalUnread = unreadCount + chatUnread;

  const unreadItems = useMemo(
    () => feedItems.filter((item) =>
      item.kind === "chat" ? item.unreadCount > 0 : item.data.is_read === 0,
    ),
    [feedItems],
  );

  const handleNavigate = useCallback(
    (url: string) => router.push(url),
    [router],
  );

  function handleChatClick(sessionId: number) {
    markChatRead(sessionId);
    router.push(`/chat?session=${sessionId}`);
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {feedItems.length > 0 && (
        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1.5 size-4" />
              Mark all as read
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All
            {feedItems.length > 0 && (
              <TabCount>{feedItems.length}</TabCount>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {totalUnread > 0 && (
              <TabCount>{totalUnread}</TabCount>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {feedItems.length > 0 ? (
            <div className="space-y-2">
              {feedItems.map((item) => (
                <FeedCard
                  key={item.kind === "chat" ? item.id : `notif-${item.data.notification_id}`}
                  item={item}
                  onReadNotification={markRead}
                  onRemoveNotification={remove}
                  onNavigate={handleNavigate}
                  onChatClick={handleChatClick}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up! Notifications will appear here."
              fullPage={false}
            />
          )}
        </TabsContent>

        <TabsContent value="unread">
          {unreadItems.length > 0 ? (
            <div className="space-y-2">
              {unreadItems.map((item) => (
                <FeedCard
                  key={item.kind === "chat" ? item.id : `notif-${item.data.notification_id}`}
                  item={item}
                  onReadNotification={markRead}
                  onRemoveNotification={remove}
                  onNavigate={handleNavigate}
                  onChatClick={handleChatClick}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCheck}
              title="All caught up"
              description="No unread notifications."
              fullPage={false}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
