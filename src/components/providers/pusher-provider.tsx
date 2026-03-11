"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  /** Subscribe to an event on the user's private channel (existing API) */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
  /** Subscribe to an arbitrary private channel. Returns a handle with subscribe/unsubscribe. */
  subscribeToChannel: (channelName: string) => ChannelHandle;
}

const PusherContext = createContext<PusherContextValue>({
  subscribe: () => () => {},
  subscribeToChannel: () => ({
    subscribe: () => () => {},
    unsubscribe: () => {},
  }),
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pusherRef = useRef<PusherClient | null>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const channelsRef = useRef<Map<string, { channel: Channel; refCount: number }>>(new Map());
  const listenersRef = useRef<Set<Listener>>(new Set());

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

    // Subscribe to the user's private channel (existing behavior)
    const userChannel = pusher.subscribe(`private-user-${session.user.id}`);
    userChannelRef.current = userChannel;

    // Listen for session revocation
    userChannel.bind("session-revoked", async () => {
      await signOut({ redirect: false });
      window.location.href = "/login";
    });

    // Bind any listeners that were registered before the channel was ready
    for (const listener of listenersRef.current) {
      userChannel.bind(listener.event, listener.callback);
    }

    return () => {
      // Cleanup all channels
      for (const [name, entry] of channelsRef.current) {
        entry.channel.unbind_all();
        pusher.unsubscribe(name);
      }
      channelsRef.current.clear();

      userChannel.unbind_all();
      pusher.unsubscribe(`private-user-${session.user.id}`);
      pusher.disconnect();
      pusherRef.current = null;
      userChannelRef.current = null;
    };
  }, [status, session?.user?.id]);

  // Existing subscribe for user channel
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

  // New: subscribe to an arbitrary channel
  const subscribeToChannel = useCallback(
    (channelName: string): ChannelHandle => {
      const pusher = pusherRef.current;

      // Get or create channel subscription
      let entry = channelsRef.current.get(channelName);
      if (!entry && pusher) {
        const channel = pusher.subscribe(channelName);
        entry = { channel, refCount: 0 };
        channelsRef.current.set(channelName, entry);
      }

      entry = channelsRef.current.get(channelName);
      if (entry) entry.refCount++;

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
    [],
  );

  return (
    <PusherContext value={{ subscribe, subscribeToChannel }}>
      {children}
    </PusherContext>
  );
}

export function usePusher() {
  return useContext(PusherContext);
}
