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

interface PusherContextValue {
  /** Subscribe to an event on the user's private channel */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
}

const PusherContext = createContext<PusherContextValue>({
  subscribe: () => () => {},
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);

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
    pusherRef.current = pusher;
    channelRef.current = channel;

    // Listen for session revocation (deactivation or role change)
    channel.bind("session-revoked", async () => {
      await signOut({ redirect: false });
      window.location.href = "/login";
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${session.user.id}`);
      pusher.disconnect();
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [status, session?.user?.id]);

  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const channel = channelRef.current;
      if (!channel) return () => {};
      channel.bind(event, callback);
      return () => channel.unbind(event, callback);
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
