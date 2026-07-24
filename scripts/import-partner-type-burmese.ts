/**
 * Backfill Burmese names (name_my) on partner_type by parse-splitting the
 * live "English (Burmese)" format stored in `name`, e.g.
 *   "Commercial Truck Dealer (လုပ်ငန်းသုံးကားရောင်းချသူ)"
 * splits into name="Commercial Truck Dealer", name_my="လုပ်ငန်းသုံးကားရောင်းချသူ".
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/import-partner-type-burmese.ts [--apply]
 *
 * Requires CLOUDFLARE_WORKER_API_TOKEN and CLOUDFLARE_WORKER_API_URL in .env.local.
 * Idempotent: rows whose split yields no Burmese, or whose name_my is already
 * set, are skipped. Defaults to dry-run; pass --apply to write.
 */

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL || "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

// Splits "English (Burmese)" → { name: "English", nameMy: "Burmese" }.
// Only splits when the TRAILING parenthetical contains Burmese Unicode (U+1000–U+109F).
// No such parenthetical (or non-Burmese) → left untouched: { name, nameMy: null }.
const BURMESE = /[က-႟]/;
export function splitPartnerName(raw: string): { name: string; nameMy: string | null } {
  const name = raw.trim();
  const m = name.match(/^(.*)\(([^()]*)\)\s*$/); // last (...) group
  if (m && BURMESE.test(m[2])) {
    return { name: m[1].trim(), nameMy: m[2].trim() };
  }
  return { name, nameMy: null };
}

interface Row {
  id: number;
  name: string;
  name_my: string | null;
}

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

interface Planned {
  id: number;
  oldName: string;
  newName: string;
  nameMy: string;
}

async function main() {
  const flags = process.argv.slice(2);
  const apply = flags.includes("--apply");

  const rows = await d1Query<Row>(
    "SELECT id, name, name_my FROM partner_type WHERE deleted_at IS NULL",
  );

  const toUpdate: Planned[] = [];
  const skippedAlreadyDone: Row[] = [];
  const skippedNoBurmese: Row[] = [];

  for (const row of rows) {
    if (row.name_my != null && row.name_my !== "") {
      skippedAlreadyDone.push(row);
      continue;
    }
    const { name: newName, nameMy } = splitPartnerName(row.name);
    if (nameMy === null) {
      skippedNoBurmese.push(row);
      continue;
    }
    toUpdate.push({ id: row.id, oldName: row.name, newName, nameMy });
  }

  // Collision guard: proposed newName must be unique among itself AND against
  // any name already present on other (non-updated) rows.
  const existingNames = new Set(
    rows
      .filter((r) => !toUpdate.some((u) => u.id === r.id))
      .map((r) => r.name),
  );
  const newNameCounts = new Map<string, Planned[]>();
  for (const p of toUpdate) {
    const list = newNameCounts.get(p.newName) ?? [];
    list.push(p);
    newNameCounts.set(p.newName, list);
  }

  const collided: Planned[] = [];
  const clean: Planned[] = [];
  for (const p of toUpdate) {
    const dupWithinBatch = (newNameCounts.get(p.newName)?.length ?? 0) > 1;
    const dupWithExisting = existingNames.has(p.newName);
    if (dupWithinBatch || dupWithExisting) {
      collided.push(p);
    } else {
      clean.push(p);
    }
  }

  console.log(`\n${apply ? "UPDATING" : "[dry-run] would update"} (${clean.length}):`);
  for (const p of clean) {
    console.log(`  #${p.id} | "${p.oldName}" -> "${p.newName}" | name_my="${p.nameMy}"`);
  }

  if (skippedAlreadyDone.length) {
    console.log(`\nSKIPPED — already done (${skippedAlreadyDone.length}):`);
    for (const r of skippedAlreadyDone) {
      console.log(`  #${r.id} | "${r.name}" | name_my="${r.name_my}"`);
    }
  }

  if (skippedNoBurmese.length) {
    console.log(`\nSKIPPED — no Burmese to split (${skippedNoBurmese.length}):`);
    for (const r of skippedNoBurmese) {
      console.log(`  #${r.id} | "${r.name}"`);
    }
  }

  if (collided.length) {
    console.log(
      `\nCOLLIDED — would violate idx_partner_type_name, NOT written (${collided.length}):`,
    );
    for (const p of collided) {
      console.log(`  #${p.id} | "${p.oldName}" -> "${p.newName}" | name_my="${p.nameMy}"`);
    }
  }

  if (!apply) {
    console.log(`\n[dry-run] No changes written. Re-run with --apply to write.`);
    return;
  }

  for (const p of clean) {
    await d1Query("UPDATE partner_type SET name = ?, name_my = ? WHERE id = ?", [
      p.newName,
      p.nameMy,
      p.id,
    ]);
  }
  console.log(`\nUpdated: ${clean.length}`);
}

// Only run when executed directly (e.g. `pnpm tsx scripts/import-partner-type-burmese.ts`),
// not when imported for `splitPartnerName` (e.g. by the self-check).
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
