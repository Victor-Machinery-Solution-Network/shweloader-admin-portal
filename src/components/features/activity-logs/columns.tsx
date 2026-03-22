"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { format } from "date-fns";
import type { ActivityLogEntry } from "@/lib/actions/activity-log";

/** Title-case a space-separated string: "equipment model" → "Equipment Model" */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a date string to time only (e.g. "2:30:05 PM") */
function formatTime(dateStr: string): string {
  try {
    const d = dateStr.endsWith("Z") ? new Date(dateStr) : new Date(dateStr + "Z");
    return format(d, "h:mm:ss a");
  } catch {
    return "";
  }
}

/**
 * Convert raw log description into a human-readable sentence.
 * Datetime is NOT included — shown in separate Date/Time columns.
 */
function humanize(raw: string, adminName: string): string {
  const parts = raw.split("|").map((s) => s.trim());
  const actionPart = parts[0] ?? "";

  // Parse key=value metadata
  const meta: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq > 0) {
      meta[parts[i].slice(0, eq).trim()] = parts[i].slice(eq + 1).trim();
    }
  }

  // ── Auth actions ──────────────────────────────────────────────────
  if (actionPart === "login_success") {
    return `${adminName} has logged in.`;
  }
  if (actionPart === "login_failed") {
    const email = meta.email ?? "unknown";
    return `Failed login attempt for ${email}.`;
  }
  if (actionPart === "logout") {
    return `${adminName} has logged out.`;
  }

  // ── Bulk actions ──────────────────────────────────────────────────
  if (actionPart.startsWith("bulk deleted")) {
    const entity = titleCase(actionPart.replace("bulk deleted", "").trim().replace(/_/g, " "));
    const count = meta.count ?? "multiple";
    return `${adminName} has deleted ${count} ${entity}.`;
  }
  if (actionPart.startsWith("bulk restored")) {
    const count = meta.count ?? "multiple";
    return `${adminName} has restored ${count} Trash Items.`;
  }
  if (actionPart.startsWith("bulk permanently deleted")) {
    const count = meta.count ?? "multiple";
    return `${adminName} has permanently deleted ${count} items.`;
  }
  if (actionPart.startsWith("bulk imported")) {
    const entity = titleCase(actionPart.replace("bulk imported", "").trim().replace(/_/g, " "));
    const succeeded = meta.succeeded ?? "?";
    const failed = meta.failed ?? "0";
    return `${adminName} has bulk imported ${entity} (${succeeded} succeeded, ${failed} failed).`;
  }

  // ── CRUD actions ──────────────────────────────────────────────────
  const crudVerbs: [string, string][] = [
    ["created and submitted", "created and submitted"],
    ["permanently deleted", "permanently deleted"],
    ["created", "created"],
    ["updated", "updated"],
    ["deleted", "deleted"],
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["published", "published"],
    ["restored", "restored"],
    ["reordered", "reordered"],
    ["toggled", "toggled"],
    ["submitted", "submitted"],
    ["requested", "requested rework for"],
    ["added", "added"],
    ["removed", "removed"],
    ["emptied", "emptied"],
  ];

  for (const [prefix, verb] of crudVerbs) {
    if (actionPart.startsWith(prefix + " ") || actionPart === prefix) {
      const entityRaw = actionPart.slice(prefix.length).trim().replace(/_/g, " ");
      const entity = titleCase(entityRaw);

      // Identifier: prefer name/title/username, fall back to id
      const identifier = meta.name
        ? ` "${meta.name}"`
        : meta.title
          ? ` "${meta.title}"`
          : meta.username
            ? ` "${meta.username}"`
            : "";

      if (entity) {
        return `${adminName} has ${verb} the ${entity}${identifier}.`;
      }
      return `${adminName} has ${verb}${identifier}.`;
    }
  }

  // ── Special named actions ─────────────────────────────────────────
  if (actionPart === "admin_role_changed") {
    return `${adminName} has changed the Role for Admin #${meta.target ?? "?"}.`;
  }
  if (actionPart === "admin_deactivated") {
    return `${adminName} has deactivated Admin #${meta.target ?? "?"}.`;
  }
  if (actionPart === "blacklisted") {
    return `${adminName} has blacklisted User #${meta.user_id ?? meta.id ?? "?"}.`;
  }
  if (actionPart === "unblacklisted") {
    return `${adminName} has unblacklisted User #${meta.user_id ?? meta.id ?? "?"}.`;
  }
  if (actionPart === "updated settings") {
    const keys = meta.keys ? ` (${meta.keys.replace(/,/g, ", ")})` : "";
    return `${adminName} has updated the Settings${keys}.`;
  }
  if (actionPart.startsWith("reset password")) {
    return `${adminName} has reset password for App User #${meta.id ?? "?"}.`;
  }

  // ── Fallback ──────────────────────────────────────────────────────
  const cleaned = raw.replace(/\|/g, ",").replace(/_/g, " ").replace(/=/g, ": ");
  return `${adminName} has ${cleaned}.`;
}

export function getColumns(): ColumnDef<ActivityLogEntry>[] {
  return [
    {
      id: "index",
      header: () => <span className="block text-center">No.</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground block text-center text-sm tabular-nums">
          {row.index + 1}
        </span>
      ),
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
    },
    {
      accessorKey: "admin_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Admin" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("admin_name") as string | null;
        return (
          <span className="text-sm font-medium">
            {name ?? "System"}
          </span>
        );
      },
    },
    {
      accessorKey: "activity_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.getValue("activity_date") as string)}
        </span>
      ),
    },
    {
      id: "activity_time",
      accessorKey: "activity_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Time" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatTime(row.original.activity_date)}
        </span>
      ),
    },
    {
      accessorKey: "activity_description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const raw = row.getValue("activity_description") as string;
        const adminName = (row.original.admin_name ?? "System");
        return (
          <span className="text-sm">
            {humanize(raw, adminName)}
          </span>
        );
      },
    },
  ];
}
