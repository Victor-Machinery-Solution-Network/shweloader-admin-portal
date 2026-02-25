"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePusher } from "@/components/providers/pusher-provider";
import {
  getMyNotifications,
  getMyUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/lib/actions/notification";
import type { Notification } from "@/types/notification";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const { subscribe } = usePusher();
  const mountedRef = useRef(true);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    Promise.all([getMyNotifications(), getMyUnreadCount()]).then(
      ([notifs, count]) => {
        if (!mountedRef.current) return;
        setNotifications(notifs);
        setUnreadCount(count);
        setIsLoaded(true);
      },
    );
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pusher subscription for real-time updates
  useEffect(() => {
    const unsubscribe = subscribe("new-notification", () => {
      // Refetch on any new notification event
      Promise.all([getMyNotifications(), getMyUnreadCount()]).then(
        ([notifs, count]) => {
          if (!mountedRef.current) return;
          setNotifications(notifs);
          setUnreadCount(count);
        },
      );
    });
    return unsubscribe;
  }, [subscribe]);

  const markRead = useCallback(async (notificationId: number) => {
    const result = await markNotificationRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: 1 } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    }
  }, []);

  const remove = useCallback(async (notificationId: number) => {
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => {
        const removed = prev.find((n) => n.notification_id === notificationId);
        if (removed && removed.is_read === 0) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.notification_id !== notificationId);
      });
    }
  }, []);

  const removeAll = useCallback(async () => {
    const result = await deleteAllNotifications();
    if (result.success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoaded,
    markRead,
    markAllRead,
    remove,
    removeAll,
  };
}
