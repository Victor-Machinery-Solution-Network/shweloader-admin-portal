"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { ActivityLogEntry } from "@/lib/actions/activity-log";

/**
 * Convert raw log description into a natural-language sentence.
 *
 * Input formats:
 *   "created brand | name=Caterpillar"
 *   "bulk deleted equipment models | count=5"
 *   "login_success | ip=::1"
 *   "toggled sale listing hidden | id=3"
 *   "admin_role_changed | target=2 | role=3"
 *   "logout"
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

  const name = adminName;

  // ── Auth actions ──────────────────────────────────────────────────
  if (actionPart === "login_success") {
    return `${name} has logged in.`;
  }
  if (actionPart === "login_failed") {
    const email = meta.email ?? "unknown";
    return `Failed login attempt for ${email}.`;
  }
  if (actionPart === "logout") {
    return `${name} has logged out.`;
  }

  // ── Bulk actions ──────────────────────────────────────────────────
  if (actionPart.startsWith("bulk deleted")) {
    const entity = actionPart.replace("bulk deleted", "").trim().replace(/_/g, " ");
    const count = meta.count ?? "multiple";
    return `${name} has deleted ${count} ${entity}.`;
  }
  if (actionPart.startsWith("bulk restored")) {
    const count = meta.count ?? "multiple";
    return `${name} has restored ${count} trash items.`;
  }
  if (actionPart.startsWith("bulk permanently deleted")) {
    const count = meta.count ?? "multiple";
    return `${name} has permanently deleted ${count} items.`;
  }
  if (actionPart.startsWith("bulk imported")) {
    const entity = actionPart.replace("bulk imported", "").trim().replace(/_/g, " ");
    const succeeded = meta.succeeded ?? "?";
    const failed = meta.failed ?? "0";
    return `${name} has bulk imported ${entity} (${succeeded} succeeded, ${failed} failed).`;
  }

  // ── CRUD actions ──────────────────────────────────────────────────
  const crudPatterns: [string, string][] = [
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
    ["requested", "requested"],
    ["added", "added"],
    ["removed", "removed"],
    ["emptied", "emptied"],
    ["permanently deleted", "permanently deleted"],
  ];

  for (const [prefix, verb] of crudPatterns) {
    if (actionPart.startsWith(prefix + " ") || actionPart === prefix) {
      const entity = actionPart.slice(prefix.length).trim().replace(/_/g, " ");

      // Build a detail suffix from metadata
      const detail = meta.name
        ? ` "${meta.name}"`
        : meta.title
          ? ` "${meta.title}"`
          : meta.username
            ? ` "${meta.username}"`
            : meta.id
              ? ` #${meta.id}`
              : meta.product
                ? ` (product #${meta.product})`
                : "";

      const extra: string[] = [];
      if (meta.type) extra.push(`type: ${meta.type.replace(/_/g, " ")}`);
      if (meta.status) extra.push(`status: ${meta.status.replace(/_/g, " ")}`);
      if (meta.role) extra.push(`role: #${meta.role}`);
      if (meta.target) extra.push(`target: #${meta.target}`);
      if (meta.count) extra.push(`${meta.count} items`);
      if (meta.group) extra.push(`group: ${meta.group}`);
      if (meta.keys) extra.push(meta.keys.replace(/,/g, ", "));

      const suffix = extra.length > 0 ? ` (${extra.join(", ")})` : "";
      return `${name} has ${verb} ${entity || "item"}${detail}${suffix}.`;
    }
  }

  // ── Special named actions ─────────────────────────────────────────
  if (actionPart === "admin_role_changed") {
    return `${name} has changed the role for admin #${meta.target ?? "?"} to role #${meta.role ?? "?"}.`;
  }
  if (actionPart === "admin_deactivated") {
    return `${name} has deactivated admin #${meta.target ?? "?"}.`;
  }
  if (actionPart === "blacklisted") {
    return `${name} has blacklisted user #${meta.user_id ?? meta.id ?? "?"}.`;
  }
  if (actionPart === "unblacklisted") {
    return `${name} has unblacklisted user #${meta.user_id ?? meta.id ?? "?"}.`;
  }

  // ── Fallback: title-case the raw string ───────────────────────────
  const cleaned = raw.replace(/\|/g, ",").replace(/_/g, " ").replace(/=/g, ": ");
  return `${name} has ${cleaned}.`;
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
        return (
          <span className="text-sm">
            {humanize(raw, adminName)}
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
