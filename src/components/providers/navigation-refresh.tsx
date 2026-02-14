"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Calls router.refresh() on every pathname change to ensure fresh server data.
 * Placed in the dashboard layout — persists across page navigations.
 * Skips the initial mount (first render already has fresh data from the server).
 */
export function NavigationRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    router.refresh();
  }, [pathname, router]);

  return null;
}
