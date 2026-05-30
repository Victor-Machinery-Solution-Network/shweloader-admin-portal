/**
 * Backfill Burmese names (name_my) on location tables from a JSON file.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/import-location-burmese.ts <file.json> [--dry-run]
 *
 * Requires CLOUDFLARE_WORKER_API_TOKEN and CLOUDFLARE_WORKER_API_URL in .env.local.
 * Idempotent: re-running overwrites name_my with the same value.
 *
 * Input contract (JSON array). Each item targets one row; match by `id` when
 * present, else by `name` (+ `parent_name` for district/township). Example:
 *   [
 *     { "level": "state_region", "id": 12, "name_my": "ရန်ကုန်တိုင်း" },
 *     { "level": "district", "name": "Bago", "parent_name": "Bago", "name_my": "ဗဂို" },
 *     { "level": "township", "name": "Tamwe", "parent_name": "Yangon East", "name_my": "တာမွေ" }
 *   ]
 */
import { readFileSync } from "node:fs";

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL || "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

type Level = "state_region" | "district" | "township";
interface Row {
  level: Level;
  id?: number;
  name?: string;
  parent_name?: string;
  name_my: string;
}
const PK: Record<Level, string> = {
  state_region: "state_region_id",
  district: "district_id",
  township: "township_id",
};
const PARENT_JOIN: Record<Level, string> = {
  state_region: "",
  district:
    "JOIN state_region p ON t.state_region_id = p.state_region_id AND p.deleted_at IS NULL",
  township:
    "JOIN district p ON t.district_id = p.district_id AND p.deleted_at IS NULL",
};

async function d1Query<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(D1_API_TOKEN ? { Authorization: `Bearer ${D1_API_TOKEN}` } : {}),
    },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) throw new Error(`D1 ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { results?: T[]; result?: T[] };
  return json.results ?? json.result ?? [];
}

function loadRows(path: string): Row[] {
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(data)) throw new Error("Input must be a JSON array");
  return data as Row[];
}

/** Resolve a row to a single primary-key id; flags unmatched (null) or ambiguous. */
async function resolveId(
  row: Row,
): Promise<{ id: number | null; ambiguous: boolean }> {
  if (typeof row.id === "number") return { id: row.id, ambiguous: false };
  if (!row.name) return { id: null, ambiguous: false };
  const pk = PK[row.level];
  const join = PARENT_JOIN[row.level];
  const where: string[] = ["t.name = ?", "t.deleted_at IS NULL"];
  const params: unknown[] = [row.name];
  if (row.level !== "state_region" && row.parent_name) {
    where.push("p.name = ?");
    params.push(row.parent_name);
  }
  const found = await d1Query<Record<string, number>>(
    `SELECT t.${pk} AS id FROM ${row.level} t ${join} WHERE ${where.join(" AND ")}`,
    params,
  );
  if (found.length === 0) return { id: null, ambiguous: false };
  if (found.length > 1) return { id: null, ambiguous: true };
  return { id: found[0].id, ambiguous: false };
}

async function main() {
  const [, , file, ...flags] = process.argv;
  if (!file) {
    console.error("Usage: pnpm tsx scripts/import-location-burmese.ts <file.json> [--dry-run]");
    process.exit(1);
  }
  const dryRun = flags.includes("--dry-run");
  const rows = loadRows(file);

  let updated = 0;
  const unmatched: Row[] = [];
  const ambiguous: Row[] = [];

  for (const row of rows) {
    if (!row.level || !PK[row.level] || !row.name_my) {
      unmatched.push(row);
      continue;
    }
    const { id, ambiguous: amb } = await resolveId(row);
    if (amb) {
      ambiguous.push(row);
      continue;
    }
    if (id == null) {
      unmatched.push(row);
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] ${row.level} #${id} -> name_my=${row.name_my}`);
    } else {
      await d1Query(
        `UPDATE ${row.level} SET name_my = ? WHERE ${PK[row.level]} = ?`,
        [row.name_my, id],
      );
    }
    updated++;
  }

  console.log(`\n${dryRun ? "[dry-run] would update" : "Updated"}: ${updated}`);
  if (unmatched.length) {
    console.log(`\nUNMATCHED (${unmatched.length}) — review manually:`);
    for (const r of unmatched)
      console.log(`  ${r.level} | name=${r.name ?? r.id} | parent=${r.parent_name ?? "-"}`);
  }
  if (ambiguous.length) {
    console.log(`\nAMBIGUOUS (${ambiguous.length}) — multiple rows match, add "id" or "parent_name":`);
    for (const r of ambiguous)
      console.log(`  ${r.level} | name=${r.name} | parent=${r.parent_name ?? "-"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
