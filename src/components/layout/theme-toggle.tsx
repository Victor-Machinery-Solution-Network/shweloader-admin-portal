"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const CYCLE = ["light", "dark", "system"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
