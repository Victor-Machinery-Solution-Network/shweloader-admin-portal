/**
 * Seed the blacklist feature + permissions into the DB.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/seed-blacklist-perms.ts
 */

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ query: sql, params }),
  });
  const data = (await res.json()) as { results?: T[]; error?: string };
  if (res.ok === false) throw new Error(JSON.stringify(data));
  return data.results ?? [];
}

async function main() {
  // Check if blacklist feature already exists
  const existing = await query<{ feature_id: number }>(
    "SELECT feature_id FROM feature WHERE name = 'blacklist'",
  );
  if (existing.length > 0) {
    console.log("blacklist feature already exists, id:", existing[0].feature_id);
    return;
  }

  // Insert feature
  await query(
    "INSERT INTO feature (name, group_name, display_order) VALUES ('blacklist', 'Users', 17)",
  );
  const feat = await query<{ feature_id: number }>(
    "SELECT feature_id FROM feature WHERE name = 'blacklist'",
  );
  const featureId = feat[0].feature_id;
  console.log("Created blacklist feature, id:", featureId);

  // Get permission IDs
  const perms = await query<{ permission_id: number; name: string }>(
    "SELECT permission_id, name FROM permission WHERE name IN ('read', 'create', 'delete')",
  );
  console.log(
    "Permissions found:",
    perms.map((p) => p.name).join(", "),
  );

  // Insert feature_permission mappings
  for (const perm of perms) {
    await query(
      "INSERT INTO feature_permission (feature_id, permission_id) VALUES (?, ?)",
      [featureId, perm.permission_id],
    );
    console.log("Added feature_permission: blacklist:" + perm.name);
  }

  // Grant to Super Admin role (role_id = 1)
  const fps = await query<{ feature_permission_id: number }>(
    "SELECT feature_permission_id FROM feature_permission WHERE feature_id = ?",
    [featureId],
  );
  for (const fp of fps) {
    await query(
      "INSERT OR IGNORE INTO role_permission (role_id, feature_permission_id, granted_by) VALUES (1, ?, 1)",
      [fp.feature_permission_id],
    );
  }
  console.log("Granted blacklist permissions to Super Admin role");
}

main().catch(console.error);
