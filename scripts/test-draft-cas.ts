/**
 * Self-check for the draft compare-and-swap (see claimDraft in
 * src/lib/actions/listing.ts). Runs against whichever D1 the env points at,
 * through the real admin-api /query endpoint — the whole point is to prove
 * `UPDATE … RETURNING` rows survive the HTTP hop, because the CAS uses the
 * returned row COUNT as its conflict signal.
 *
 * If this ever fails, shared draft editing is silently unsafe: a claim that
 * always "succeeds" means two admins can overwrite each other.
 *
 * Usage: pnpm tsx --env-file=.env.local scripts/test-draft-cas.ts
 */

const API_URL = process.env.CLOUDFLARE_WORKER_API_URL;
const API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN;

if (!API_URL || !API_TOKEN) {
  console.error("Missing CLOUDFLARE_WORKER_API_URL / _TOKEN");
  process.exit(1);
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ query: sql, params }),
  });
  const json = (await res.json()) as { results?: T[]; error?: string };
  if (json.error) throw new Error(json.error);
  return json.results ?? [];
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log(`  ✓ ${msg}`);
}

/** The exact statement claimDraft runs. */
function claim(id: number, expectedVersion: number, userId: number) {
  return query<{ version: number }>(
    `UPDATE product_list
        SET version = version + 1, updated_by = ?, updated_at = ?
      WHERE id = ? AND version = ? AND is_draft = 1 AND deleted_at IS NULL
      RETURNING version`,
    [userId, new Date().toISOString(), id, expectedVersion],
  );
}

async function main() {
  console.log(`Draft CAS self-check → ${API_URL}\n`);

  const suffix = `CASTEST${Date.now()}`;
  const inserted = await query<{ id: number }>(
    `INSERT INTO product_list (custom_id_suffix, is_draft, created_by, updated_by, description)
     VALUES (?, 1, NULL, NULL, 'draft CAS self-check — safe to delete')
     RETURNING id`,
    [suffix],
  );
  assert(
    inserted.length === 1 && !!inserted[0].id,
    "INSERT … RETURNING returns the new row over HTTP",
  );
  const id = inserted[0].id;

  try {
    const [seed] = await query<{ version: number }>(
      "SELECT version FROM product_list WHERE id = ?",
      [id],
    );
    assert(seed.version === 1, "new draft starts at version 1");

    // Admin A saves against the version they loaded.
    const a = await claim(id, 1, 1);
    assert(a.length === 1, "claim with the current version returns 1 row");
    assert(a[0].version === 2, "claim increments the version to 2");

    // Admin B still holds version 1 — this is the lost-update case.
    const b = await claim(id, 1, 2);
    assert(
      b.length === 0,
      "claim with a stale version returns 0 rows (conflict detected)",
    );

    const [afterB] = await query<{ version: number; updated_by: number }>(
      "SELECT version, updated_by FROM product_list WHERE id = ?",
      [id],
    );
    assert(afterB.version === 2, "a rejected claim does not bump the version");
    assert(afterB.updated_by === 1, "a rejected claim does not steal updated_by");

    // B reloads and retries — the "Overwrite with mine" path.
    const bRetry = await claim(id, 2, 2);
    assert(bRetry.length === 1, "claim with the refreshed version succeeds");
    assert(bRetry[0].version === 3, "version advances to 3");

    // A draft that became a listing can no longer be claimed. product_list's
    // CHECK constraint requires exactly one model once is_draft flips to 0,
    // so borrow a real one first.
    const [model] = await query<{ model_id: number }>(
      "SELECT model_id FROM equipment_model LIMIT 1",
    );
    assert(!!model, "found an equipment_model to satisfy the CHECK constraint");
    await query(
      "UPDATE product_list SET equipment_model_id = ?, is_draft = 0 WHERE id = ?",
      [model.model_id, id],
    );
    const gone = await claim(id, 3, 1);
    assert(gone.length === 0, "a submitted draft rejects further claims");

    // Soft-deleted drafts likewise.
    await query(
      "UPDATE product_list SET is_draft = 1, deleted_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );
    const deleted = await claim(id, 3, 1);
    assert(deleted.length === 0, "a deleted draft rejects further claims");
  } finally {
    await query("DELETE FROM product_list WHERE id = ?", [id]);
    console.log(`\nCleaned up test row ${id}`);
  }

  console.log("\nAll draft CAS checks passed.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
