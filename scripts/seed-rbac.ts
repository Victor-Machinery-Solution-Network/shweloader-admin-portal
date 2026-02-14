/**
 * Seed script: Insert RBAC data (permissions, features, feature_permissions,
 * Super Admin role, and role_permissions) into D1.
 *
 * Safe to re-run: checks for existing data before inserting.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/seed-rbac.ts
 *
 * Requires D1_API_TOKEN and NEXT_PUBLIC_D1_API_URL in .env.local
 */

// ---- D1 REST API config ----
const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  "https://cloudflare-d1-rest-api.shweloader.workers.dev";
const D1_API_TOKEN = process.env.D1_API_TOKEN || "";

// ---- Seed Data ----

const PERMISSIONS = ["create", "read", "edit", "delete", "approve"] as const;

const FEATURES = [
  "sale_listings",
  "rent_listings",
  "featured_listings",
  "partners",
  "articles",
  "article_categories",
  "equipment_main_categories",
  "equipment_sub_categories",
  "equipment_models",
  "attachment_categories",
  "attachment_models",
  "brands",
  "locations",
  "announcements",
  "carousels",
  "customers",
  "enquiries",
  "admin_users",
  "roles",
  "app_settings",
  "business_types",
] as const;

/**
 * Defines which permissions are valid for each feature.
 * Features not listed here get full CRUD (create, read, edit, delete).
 */
const FEATURE_PERMISSION_MAP: Record<string, string[]> = {
  // CRUD + Approve
  sale_listings: ["create", "read", "edit", "delete", "approve"],
  rent_listings: ["create", "read", "edit", "delete", "approve"],
  articles: ["create", "read", "edit", "delete", "approve"],
  // No create (users apply/register themselves)
  partners: ["read", "edit", "delete", "approve"],
  customers: ["read", "edit", "delete"],
  enquiries: ["read", "edit", "delete"],
  // Read + Edit only
  app_settings: ["read", "edit"],
};

const DEFAULT_PERMISSIONS = ["create", "read", "edit", "delete"];

// ---- D1 API helpers ----

async function d1Query<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ query, params }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`D1 query failed: ${JSON.stringify(data)}`);
  }

  return (data as { results?: T[] }).results ?? [];
}

async function d1Execute(query: string, params: unknown[] = []) {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ query, params }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`D1 execute failed: ${JSON.stringify(data)}`);
  }

  return data;
}

// ---- Seed functions ----

async function seedPermissions() {
  console.log("1/6 Seeding permissions...");

  const existing = await d1Query<{ name: string }>(
    "SELECT name FROM permission"
  );
  const existingNames = new Set(existing.map((r) => r.name));

  let inserted = 0;
  for (const name of PERMISSIONS) {
    if (existingNames.has(name)) {
      console.log(`     [skip] permission "${name}" already exists`);
      continue;
    }
    await d1Execute("INSERT INTO permission (name) VALUES (?)", [name]);
    console.log(`     [add]  permission "${name}"`);
    inserted++;
  }

  console.log(`     Done: ${inserted} added, ${existingNames.size} existed\n`);
}

async function seedFeatures() {
  console.log("2/6 Seeding features...");

  const existing = await d1Query<{ name: string }>("SELECT name FROM feature");
  const existingNames = new Set(existing.map((r) => r.name));

  let inserted = 0;
  for (const name of FEATURES) {
    if (existingNames.has(name)) {
      console.log(`     [skip] feature "${name}" already exists`);
      continue;
    }
    await d1Execute("INSERT INTO feature (name) VALUES (?)", [name]);
    console.log(`     [add]  feature "${name}"`);
    inserted++;
  }

  console.log(`     Done: ${inserted} added, ${existingNames.size} existed\n`);
}

async function seedFeaturePermissions() {
  console.log("3/6 Seeding feature_permissions...");

  // Fetch current IDs
  const features = await d1Query<{ feature_id: number; name: string }>(
    "SELECT feature_id, name FROM feature"
  );
  const permissions = await d1Query<{ permission_id: number; name: string }>(
    "SELECT permission_id, name FROM permission"
  );
  const existing = await d1Query<{
    feature_id: number;
    permission_id: number;
  }>("SELECT feature_id, permission_id FROM feature_permission");

  const featureMap = new Map(features.map((f) => [f.name, f.feature_id]));
  const permissionMap = new Map(
    permissions.map((p) => [p.name, p.permission_id])
  );
  const existingSet = new Set(
    existing.map((e) => `${e.feature_id}:${e.permission_id}`)
  );

  let inserted = 0;
  for (const featureName of FEATURES) {
    const featureId = featureMap.get(featureName);
    if (!featureId) continue;

    const perms =
      FEATURE_PERMISSION_MAP[featureName] ?? DEFAULT_PERMISSIONS;

    for (const permName of perms) {
      const permId = permissionMap.get(permName);
      if (!permId) continue;

      const key = `${featureId}:${permId}`;
      if (existingSet.has(key)) continue;

      await d1Execute(
        "INSERT INTO feature_permission (feature_id, permission_id) VALUES (?, ?)",
        [featureId, permId]
      );
      inserted++;
    }
  }

  const total = existing.length + inserted;
  console.log(
    `     Done: ${inserted} added, ${existing.length} existed (${total} total)\n`
  );
}

async function seedSuperAdminRole() {
  console.log("4/6 Seeding Super Admin role...");

  const existing = await d1Query<{ role_id: number }>(
    "SELECT role_id FROM role WHERE name = ?",
    ["Super Admin"]
  );

  if (existing.length > 0) {
    console.log(
      `     [skip] Role "Super Admin" already exists (role_id: ${existing[0].role_id})\n`
    );
    return existing[0].role_id;
  }

  await d1Execute(
    "INSERT INTO role (name, description, created_by) VALUES (?, ?, NULL)",
    ["Super Admin", "Full access to all features and permissions"]
  );

  const [role] = await d1Query<{ role_id: number }>(
    "SELECT role_id FROM role WHERE name = ?",
    ["Super Admin"]
  );

  console.log(`     [add]  Role "Super Admin" (role_id: ${role.role_id})\n`);
  return role.role_id;
}

async function assignRoleToAdmin(roleId: number) {
  console.log("5/6 Assigning Super Admin role to admin user...");

  const [admin] = await d1Query<{ user_id: number; role_id: number | null }>(
    "SELECT user_id, role_id FROM admin_user WHERE user_id = 1"
  );

  if (!admin) {
    console.log(
      "     [warn] No admin user found (user_id=1). Run seed-admin.ts first.\n"
    );
    return;
  }

  if (admin.role_id === roleId) {
    console.log(
      `     [skip] Admin user already has role_id=${roleId}\n`
    );
    return;
  }

  await d1Execute("UPDATE admin_user SET role_id = ? WHERE user_id = 1", [
    roleId,
  ]);
  console.log(
    `     [update] admin_user.user_id=1 role_id: ${admin.role_id} → ${roleId}\n`
  );
}

async function seedRolePermissions(roleId: number) {
  console.log("6/6 Granting all permissions to Super Admin...");

  const allFp = await d1Query<{ feature_permission_id: number }>(
    "SELECT feature_permission_id FROM feature_permission"
  );

  const existing = await d1Query<{ feature_permission_id: number }>(
    "SELECT feature_permission_id FROM role_permission WHERE role_id = ?",
    [roleId]
  );
  const existingSet = new Set(existing.map((e) => e.feature_permission_id));

  let inserted = 0;
  for (const fp of allFp) {
    if (existingSet.has(fp.feature_permission_id)) continue;

    await d1Execute(
      "INSERT INTO role_permission (role_id, feature_permission_id, granted_by) VALUES (?, ?, NULL)",
      [roleId, fp.feature_permission_id]
    );
    inserted++;
  }

  console.log(
    `     Done: ${inserted} added, ${existingSet.size} existed (${allFp.length} total)\n`
  );
}

// ---- Main ----

async function main() {
  console.log("=".repeat(50));
  console.log("  RBAC Seed Script");
  console.log("=".repeat(50));
  console.log(`  D1 API: ${D1_BASE_URL}\n`);

  if (!D1_API_TOKEN) {
    console.error("  ERROR: D1_API_TOKEN is not set in .env.local");
    process.exit(1);
  }

  await seedPermissions();
  await seedFeatures();
  await seedFeaturePermissions();
  const roleId = await seedSuperAdminRole();
  await assignRoleToAdmin(roleId);
  await seedRolePermissions(roleId);

  // Final summary
  console.log("=".repeat(50));
  console.log("  Summary");
  console.log("=".repeat(50));

  const counts = await Promise.all([
    d1Query<{ c: number }>("SELECT COUNT(*) as c FROM permission"),
    d1Query<{ c: number }>("SELECT COUNT(*) as c FROM feature"),
    d1Query<{ c: number }>("SELECT COUNT(*) as c FROM feature_permission"),
    d1Query<{ c: number }>("SELECT COUNT(*) as c FROM role"),
    d1Query<{ c: number }>("SELECT COUNT(*) as c FROM role_permission"),
  ]);

  console.log(`  permissions:        ${counts[0][0]?.c ?? 0}`);
  console.log(`  features:           ${counts[1][0]?.c ?? 0}`);
  console.log(`  feature_permissions: ${counts[2][0]?.c ?? 0}`);
  console.log(`  roles:              ${counts[3][0]?.c ?? 0}`);
  console.log(`  role_permissions:   ${counts[4][0]?.c ?? 0}`);
  console.log("\n  RBAC seed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
