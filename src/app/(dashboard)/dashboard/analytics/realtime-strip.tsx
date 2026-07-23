"use client";

import { useEffect, useState } from "react";

export default function RealtimeStrip() {
  const [total, setTotal] = useState<number | null>(null);
  const [perMinute, setPerMinute] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      if (document.hidden) return; // don't burn quota on idle tabs
      try {
        const res = await fetch("/api/analytics/realtime");
        if (!res.ok) return;
        const d = await res.json();
        if (!alive) return;
        if (d.configured === false) {
          setTotal(null);
          setPerMinute([]);
          return;
        }
        setTotal(d.total ?? 0);
        setPerMinute(d.perMinute ?? []);
      } catch {
        /* transient — keep last value */
      }
    }
    poll();
    const id = setInterval(poll, 30_000);
    function onVisible() {
      if (!document.hidden) poll();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const max = Math.max(1, ...perMinute);

  return (
    <div className="flex items-center gap-6 rounded-xl border p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-sm text-muted-foreground">Active now</span>
        </div>
        <p className="text-3xl font-bold tabular-nums">{total ?? "—"}</p>
      </div>
      <div className="flex h-12 flex-1 items-end gap-0.5">
        {perMinute.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${(v / max) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
