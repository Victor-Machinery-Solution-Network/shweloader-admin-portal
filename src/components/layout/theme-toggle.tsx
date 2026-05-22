"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const CYCLE = ["light", "dark", "system"] as const;

// SSR-safe "is hydrated" signal — no useEffect, no flash, returns false on server
// and true after hydration. See https://react.dev/reference/react/useSyncExternalStore
const subscribeNoop = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNoop, getSnapshot, getServerSnapshot);

  const next = CYCLE[(CYCLE.indexOf(theme as (typeof CYCLE)[number]) + 1) % CYCLE.length];

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System theme";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={mounted ? `${label} — click to switch` : "Toggle theme"}
      onClick={() => setTheme(next)}
    >
      {mounted ? <Icon className="h-4 w-4" aria-hidden="true" /> : <Monitor className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}
