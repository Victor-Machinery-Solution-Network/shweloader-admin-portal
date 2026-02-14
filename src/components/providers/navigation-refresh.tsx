"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/**
 * Calls router.refresh() on every pathname change to ensure fresh server data.
 * Wrapped in startTransition so React keeps showing the current page
 * until new data is ready — no visible flash or loading state.
 * Skips the initial mount (first render already has fresh data from the server).
 */
export function NavigationRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const isInitial = useRef(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }, [pathname, router, startTransition]);

  return null;
}
