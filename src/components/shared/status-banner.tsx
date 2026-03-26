"use client";

import { CheckCircle, RotateCcw, Info } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface StatusBannerProps {
  status: "approved" | "rework" | "resolved";
  actionBy?: string | null;
  actionAt?: string | null;
  reason?: string | null;
}

const config = {
  approved: {
    icon: CheckCircle,
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-300",
    label: "already been approved",
  },
  rework: {
    icon: RotateCcw,
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-300",
    label: "been sent back for rework",
  },
  resolved: {
    icon: Info,
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-300",
    label: "already been resolved",
  },
};

export function StatusBanner({ status, actionBy, actionAt, reason }: StatusBannerProps) {
  const { icon: Icon, bg, text, label } = config[status];

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${bg}`}>
      <Icon className={`size-5 shrink-0 mt-0.5 ${text}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${text}`}>
          This has {label}
          {actionBy && ` by ${actionBy}`}
          {actionAt && ` ${timeAgo(actionAt)}`}
        </p>
        {reason && (
          <p className={`mt-1 text-sm ${text} opacity-80`}>
            Reason: {reason}
          </p>
        )}
      </div>
    </div>
  );
}
