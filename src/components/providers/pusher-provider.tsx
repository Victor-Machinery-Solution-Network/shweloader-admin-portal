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

type Listener = { event: string; callback: (data: unknown) => void };

interface PusherContextValue {
  /** Subscribe to an event on the user's private channel */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
}

const PusherContext = createContext<PusherContextValue>({
  subscribe: () => () => {},
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);
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

    const channel = pusher.subscribe(`private-user-${session.user.id}`);
    channelRef.current = channel;

    // Listen for session revocation (deactivation or role change)
    channel.bind("session-revoked", async () => {
      await signOut({ redirect: false });
      window.location.href = "/login";
    });

    // Bind any listeners that were registered before the channel was ready
    for (const listener of listenersRef.current) {
      channel.bind(listener.event, listener.callback);
    }

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${session.user.id}`);
      pusher.disconnect();
      channelRef.current = null;
    };
  }, [status, session?.user?.id]);

  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const listener: Listener = { event, callback };
      listenersRef.current.add(listener);

      // If channel is already connected, bind immediately
      const channel = channelRef.current;
      if (channel) {
        channel.bind(event, callback);
      }

      return () => {
        listenersRef.current.delete(listener);
        const ch = channelRef.current;
        if (ch) {
          ch.unbind(event, callback);
        }
      };
    },
    [],
  );

  return (
    <PusherContext value={{ subscribe }}>
      {children}
    </PusherContext>
  );
}

export function usePusher() {
  return useContext(PusherContext);
}
