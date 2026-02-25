"use client";

import { useCallback, useMemo, useState } from "react";
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
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import type { Notification, NotificationType } from "@/types/notification";

const typeIcons: Record<NotificationType, typeof FileText> = {
  article_submitted: FileText,
  article_approved: CheckCircle,
  article_rework: XCircle,
  listing_submitted: Package,
  listing_approved: CheckCircle,
  listing_rework: XCircle,
};

const typeColors: Record<NotificationType, string> = {
  article_submitted: "bg-blue-500/10 text-blue-600",
  article_approved: "bg-emerald-500/10 text-emerald-600",
  article_rework: "bg-amber-500/10 text-amber-600",
  listing_submitted: "bg-indigo-500/10 text-indigo-600",
  listing_approved: "bg-emerald-500/10 text-emerald-600",
  listing_rework: "bg-amber-500/10 text-amber-600",
};

function NotificationCard({
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
      {/* Icon */}
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconColor)}>
        <Icon className="size-4" />
      </div>

      {/* Content */}
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

      {/* Actions */}
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

export function NotificationsClient() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoaded,
    markRead,
    markAllRead,
    remove,
    removeAll,
  } = useNotifications();

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => n.is_read === 0),
    [notifications],
  );

  const handleNavigate = useCallback(
    (url: string) => router.push(url),
    [router],
  );

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
      {notifications.length > 0 && (
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1.5 size-4" />
              Mark all as read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={removeAll}
          >
            <Trash2 className="mr-1.5 size-4" />
            Delete all
          </Button>
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <TabCount>{notifications.length}</TabCount>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <TabCount>{unreadCount}</TabCount>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((n) => (
                <NotificationCard
                  key={n.notification_id}
                  notification={n}
                  onRead={markRead}
                  onRemove={remove}
                  onNavigate={handleNavigate}
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
          {unreadNotifications.length > 0 ? (
            <div className="space-y-2">
              {unreadNotifications.map((n) => (
                <NotificationCard
                  key={n.notification_id}
                  notification={n}
                  onRead={markRead}
                  onRemove={remove}
                  onNavigate={handleNavigate}
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
