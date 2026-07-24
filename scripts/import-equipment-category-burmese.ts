/**
 * Backfill Burmese names (name_my) on equipment_main_category and
 * equipment_sub_category from a JSON file.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/import-equipment-category-burmese.ts <file.json> [--apply]
 *
 * Requires CLOUDFLARE_WORKER_API_TOKEN and CLOUDFLARE_WORKER_API_URL in .env.local.
 * Idempotent: re-running overwrites name_my with the same value.
 *
 * Input contract (JSON array). Each item targets one row; matched by English
 * `name` (+ `parent_name` for "sub" rows, to disambiguate a sub-category
 * name that repeats under different main categories). Example:
 *   [
 *     { "level": "main", "name": "Excavator", "name_my": "..." },
 *     { "level": "sub", "name": "Mini Excavator", "parent_name": "Excavator", "name_my": "..." }
 *   ]
 *
 * Defaults to dry-run (prints resolved id + planned name_my per row).
 * Pass --apply to write.
 */
import { readFileSync } from "node:fs";

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL || "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

type Level = "main" | "sub";
interface Row {
  level: Level;
  name: string;
  parent_name?: string;
  name_my: string;
}

const TABLE: Record<Level, string> = {
  main: "equipment_main_category",
  sub: "equipment_sub_category",
};
const PK: Record<Level, string> = {
  main: "category_id",
  sub: "sub_category_id",
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
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw new Error(`Cannot read file "${path}": ${(e as Error).message}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in "${path}": ${(e as Error).message}`);
  }
  if (!Array.isArray(data)) throw new Error("Input must be a JSON array");
  return data as Row[];
}

/** Structural check on a parsed row; returns a reason string when invalid, else null. */
function invalidReason(row: Row): string | null {
  if (row == null || typeof row !== "object") return "not an object";
  if (row.level !== "main" && row.level !== "sub")
    return `level must be "main" or "sub" (got ${JSON.stringify(row.level)})`;
  if (typeof row.name !== "string" || row.name.trim() === "")
    return "missing/invalid \"name\"";
  if (typeof row.name_my !== "string" || row.name_my.trim() === "")
    return "missing/invalid \"name_my\"";
  if (row.parent_name !== undefined && typeof row.parent_name !== "string")
    return "\"parent_name\" must be a string when present";
  return null;
}

/** Resolve a row to a single primary-key id; flags unmatched (null id) or ambiguous. */
async function resolveId(
  row: Row,
): Promise<{ id: number | null; ambiguous: boolean }> {
  let found: Record<string, number>[];
  if (row.level === "main") {
    found = await d1Query<Record<string, number>>(
      "SELECT category_id AS id FROM equipment_main_category WHERE name = ? AND deleted_at IS NULL",
      [row.name],
    );
  } else {
    const where = ["s.name = ?", "s.deleted_at IS NULL"];
    const params: unknown[] = [row.name];
    if (row.parent_name) {
      where.push("m.name = ?");
      params.push(row.parent_name);
    }
    found = await d1Query<Record<string, number>>(
      `SELECT s.sub_category_id AS id
       FROM equipment_sub_category s
       JOIN equipment_main_category m ON s.category_id = m.category_id AND m.deleted_at IS NULL
       WHERE ${where.join(" AND ")}`,
      params,
    );
  }
  if (found.length === 0) return { id: null, ambiguous: false };
  if (found.length > 1) return { id: null, ambiguous: true };
  return { id: found[0].id, ambiguous: false };
}

async function main() {
  const [, , file, ...flags] = process.argv;
  if (!file) {
    console.error(
      "Usage: pnpm tsx scripts/import-equipment-category-burmese.ts <file.json> [--apply]",
    );
    process.exit(1);
  }
  const apply = flags.includes("--apply");
  const rows = loadRows(file);

  let updated = 0;
  const invalid: { row: Row; reason: string }[] = [];
  const unmatched: Row[] = [];
  const ambiguous: Row[] = [];

  for (const row of rows) {
    const reason = invalidReason(row);
    if (reason) {
      invalid.push({ row, reason });
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
    if (apply) {
      await d1Query(
        `UPDATE ${TABLE[row.level]} SET name_my = ? WHERE ${PK[row.level]} = ?`,
        [row.name_my, id],
      );
    } else {
      console.log(`[dry-run] ${row.level} #${id} "${row.name}" -> name_my=${row.name_my}`);
    }
    updated++;
  }

  console.log(`\n${apply ? "Updated" : "[dry-run] would update"}: ${updated}`);

  if (invalid.length) {
    console.log(`\nINVALID (${invalid.length}) — malformed rows, skipped:`);
    for (const { row, reason } of invalid) console.log(`  ${JSON.stringify(row)} — ${reason}`);
  }
  if (unmatched.length) {
    console.log(`\nUNMATCHED (${unmatched.length}) — no matching row found, review manually:`);
    for (const r of unmatched)
      console.log(`  ${r.level} | name="${r.name}" | parent=${r.parent_name ?? "-"}`);
  }
  if (ambiguous.length) {
    console.log(
      `\nAMBIGUOUS (${ambiguous.length}) — multiple rows match, add/fix "parent_name" to disambiguate:`,
    );
    for (const r of ambiguous)
      console.log(`  ${r.level} | name="${r.name}" | parent=${r.parent_name ?? "-"}`);
  }

  if (!apply) {
    console.log(`\n[dry-run] No changes written. Re-run with --apply to write.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
