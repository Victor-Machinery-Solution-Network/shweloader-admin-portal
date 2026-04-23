"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession, signOut } from "next-auth/react";
import PusherClient from "pusher-js";
import type { Channel } from "pusher-js";

type Listener = { event: string; callback: (data: unknown) => void };

interface ChannelHandle {
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
  unsubscribe: () => void;
}

interface PusherContextValue {
  /** Subscribe to an event on the user's private channel */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
  /** Subscribe to an event on the admin chat channel (same deferred pattern as subscribe) */
  subscribeAdminChat: (event: string, callback: (data: unknown) => void) => () => void;
  /** Subscribe to an arbitrary private channel (only works after Pusher is connected) */
  subscribeToChannel: (channelName: string) => ChannelHandle;
  /** True when Pusher client is connected and ready */
  isReady: boolean;
}

const PusherContext = createContext<PusherContextValue>({
  subscribe: () => () => {},
  subscribeAdminChat: () => () => {},
  subscribeToChannel: () => ({
    subscribe: () => () => {},
    unsubscribe: () => {},
  }),
  isReady: false,
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pusherRef = useRef<PusherClient | null>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const adminChatChannelRef = useRef<Channel | null>(null);
  const channelsRef = useRef<Map<string, { channel: Channel; refCount: number }>>(new Map());
  const [isReady, setIsReady] = useState(false);
  // Deferred listeners for user channel
  const listenersRef = useRef<Set<Listener>>(new Set());
  // Deferred listeners for admin chat channel
  const adminChatListenersRef = useRef<Set<Listener>>(new Set());

  // Derive a primitive dep so the effect doesn't re-run on every session
  // object reference change (next-auth can hand back fresh references on poll).
  const canReadChat =
    session?.user?.permissions?.includes("chat:read") ?? false;

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (status !== "authenticated" || !session?.user?.id || !key || !cluster) {
      return;
    }

    const pusher = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
    pusherRef.current = pusher;

    // Subscribe to the user's private channel
    const userChannel = pusher.subscribe(`private-user-${session.user.id}`);
    userChannelRef.current = userChannel;

    userChannel.bind("session-revoked", async () => {
      await signOut({ redirect: false });
      window.location.href = "/login";
    });

    // Bind deferred user channel listeners
    for (const listener of listenersRef.current) {
      userChannel.bind(listener.event, listener.callback);
    }

    // Subscribe to admin chat channel (for bell notifications) only when the
    // user has chat:read — otherwise /api/pusher/auth returns 403 for this
    // private channel.
    const adminChatChannel = canReadChat
      ? pusher.subscribe("private-admin-chat")
      : null;
    adminChatChannelRef.current = adminChatChannel;

    // Bind deferred admin chat listeners
    if (adminChatChannel) {
      for (const listener of adminChatListenersRef.current) {
        adminChatChannel.bind(listener.event, listener.callback);
      }
    }

    setIsReady(true);

    return () => {
      setIsReady(false);
      for (const [name, entry] of channelsRef.current) {
        entry.channel.unbind_all();
        pusher.unsubscribe(name);
      }
      channelsRef.current.clear();

      userChannel.unbind_all();
      pusher.unsubscribe(`private-user-${session.user.id}`);

      if (adminChatChannel) {
        adminChatChannel.unbind_all();
        pusher.unsubscribe("private-admin-chat");
      }
      adminChatChannelRef.current = null;

      pusher.disconnect();
      pusherRef.current = null;
      userChannelRef.current = null;
    };
  }, [status, session?.user?.id, canReadChat]);

  // Subscribe to user's private channel (deferred)
  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const listener: Listener = { event, callback };
      listenersRef.current.add(listener);

      const channel = userChannelRef.current;
      if (channel) {
        channel.bind(event, callback);
      }

      return () => {
        listenersRef.current.delete(listener);
        const ch = userChannelRef.current;
        if (ch) {
          ch.unbind(event, callback);
        }
      };
    },
    [],
  );

  // Subscribe to admin chat channel (deferred — same pattern as subscribe)
  const subscribeAdminChat = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const listener: Listener = { event, callback };
      adminChatListenersRef.current.add(listener);
      const channel = adminChatChannelRef.current;
      if (channel) {
        channel.bind(event, callback);
      }

      return () => {
        adminChatListenersRef.current.delete(listener);
        const ch = adminChatChannelRef.current;
        if (ch) {
          ch.unbind(event, callback);
        }
      };
    },
    [],
  );

  // Subscribe to arbitrary channel (only works when Pusher is already connected)
  const subscribeToChannel = useCallback(
    (channelName: string): ChannelHandle => {
      const pusher = pusherRef.current;

      // For admin-chat, reuse the always-on channel
      if (channelName === "private-admin-chat") {
        return {
          subscribe: (event: string, callback: (data: unknown) => void) => {
            return subscribeAdminChat(event, callback);
          },
          unsubscribe: () => {}, // Don't unsubscribe the shared channel
        };
      }

      if (!pusher) {
        return {
          subscribe: () => () => {},
          unsubscribe: () => {},
        };
      }

      let entry = channelsRef.current.get(channelName);
      if (!entry) {
        const channel = pusher.subscribe(channelName);
        entry = { channel, refCount: 0 };
        channelsRef.current.set(channelName, entry);
      }
      entry.refCount++;

      return {
        subscribe: (event: string, callback: (data: unknown) => void) => {
          const ch = channelsRef.current.get(channelName)?.channel;
          if (ch) {
            ch.bind(event, callback);
          }
          return () => {
            const c = channelsRef.current.get(channelName)?.channel;
            if (c) {
              c.unbind(event, callback);
            }
          };
        },
        unsubscribe: () => {
          const e = channelsRef.current.get(channelName);
          if (e) {
            e.refCount--;
            if (e.refCount <= 0) {
              e.channel.unbind_all();
              pusherRef.current?.unsubscribe(channelName);
              channelsRef.current.delete(channelName);
            }
          }
        },
      };
    },
    [subscribeAdminChat],
  );

  return (
    <PusherContext value={{ subscribe, subscribeAdminChat, subscribeToChannel, isReady }}>
      {children}
    </PusherContext>
  );
}

export function usePusher() {
  return useContext(PusherContext);
}
