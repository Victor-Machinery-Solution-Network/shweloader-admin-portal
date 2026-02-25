"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";

interface PermissionsContextValue {
  permissions: string[];
  isLoaded: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  isLoaded: false,
});

/**
 * Reads permissions directly from the JWT session — no server action fetch needed.
 * Permissions are stored in the JWT at login time (see auth.ts authorize callback).
 */
export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  const permissions = session?.user?.permissions ?? [];
  const isLoaded = status !== "loading";

  return (
    <PermissionsContext value={{ permissions, isLoaded }}>
      {children}
    </PermissionsContext>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
