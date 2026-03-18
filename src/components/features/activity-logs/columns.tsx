"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { ActivityLogEntry } from "@/lib/actions/activity-log";

/** Title-case a space-separated string: "equipment model" → "Equipment Model" */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Convert raw log description + timestamp into a human-readable sentence.
 *
 * Output style matches the reference portal:
 *   "Admin has created the Brand at 2026-03-18 14:30:05."
 *   "Admin has logged in at 2026-03-18 14:30:05."
 */
function humanize(raw: string, adminName: string, date: string): string {
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

  const at = date ? ` at ${date.replace("T", " ").replace(/\.\d+Z?$/, "")}` : "";

  // ── Auth actions ──────────────────────────────────────────────────
  if (actionPart === "login_success") {
    return `${adminName} has logged in${at}.`;
  }
  if (actionPart === "login_failed") {
    const email = meta.email ?? "unknown";
    return `Failed login attempt for ${email}${at}.`;
  }
  if (actionPart === "logout") {
    return `${adminName} has logged out${at}.`;
  }

  // ── Bulk actions ──────────────────────────────────────────────────
  if (actionPart.startsWith("bulk deleted")) {
    const entity = titleCase(actionPart.replace("bulk deleted", "").trim().replace(/_/g, " "));
    const count = meta.count ?? "multiple";
    return `${adminName} has deleted ${count} ${entity}${at}.`;
  }
  if (actionPart.startsWith("bulk restored")) {
    const count = meta.count ?? "multiple";
    return `${adminName} has restored ${count} Trash Items${at}.`;
  }
  if (actionPart.startsWith("bulk permanently deleted")) {
    const count = meta.count ?? "multiple";
    return `${adminName} has permanently deleted ${count} items${at}.`;
  }
  if (actionPart.startsWith("bulk imported")) {
    const entity = titleCase(actionPart.replace("bulk imported", "").trim().replace(/_/g, " "));
    const succeeded = meta.succeeded ?? "?";
    const failed = meta.failed ?? "0";
    return `${adminName} has bulk imported ${entity} (${succeeded} succeeded, ${failed} failed)${at}.`;
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
        return `${adminName} has ${verb} the ${entity}${identifier}${at}.`;
      }
      return `${adminName} has ${verb}${identifier}${at}.`;
    }
  }

  // ── Special named actions ─────────────────────────────────────────
  if (actionPart === "admin_role_changed") {
    return `${adminName} has changed the Role for Admin #${meta.target ?? "?"}${at}.`;
  }
  if (actionPart === "admin_deactivated") {
    return `${adminName} has deactivated Admin #${meta.target ?? "?"}${at}.`;
  }
  if (actionPart === "blacklisted") {
    return `${adminName} has blacklisted User #${meta.user_id ?? meta.id ?? "?"}${at}.`;
  }
  if (actionPart === "unblacklisted") {
    return `${adminName} has unblacklisted User #${meta.user_id ?? meta.id ?? "?"}${at}.`;
  }
  if (actionPart === "updated settings") {
    const keys = meta.keys ? ` (${meta.keys.replace(/,/g, ", ")})` : "";
    return `${adminName} has updated the Settings${keys}${at}.`;
  }

  // ── Fallback ──────────────────────────────────────────────────────
  const cleaned = raw.replace(/\|/g, ",").replace(/_/g, " ").replace(/=/g, ": ");
  return `${adminName} has ${cleaned}${at}.`;
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
      accessorKey: "activity_description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const raw = row.getValue("activity_description") as string;
        const adminName = (row.original.admin_name ?? "System");
        const date = row.original.activity_date;
        return (
          <span className="text-sm">
            {humanize(raw, adminName, date)}
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
  ];
}
