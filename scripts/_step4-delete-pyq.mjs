/**
 * STEP 4 — Delete the old 358 pyq/en rows from the global bank.
 * Guard: aborts if the backup file is missing.
 * Reports exact count deleted. Does nothing else.
 */
import fs from "node:fs";

const BACKUP = "docs/papers/pyq-backup-2026-06-21.csv";
if (!fs.existsSync(BACKUP)) {
  console.error(`ABORT — backup not found: ${BACKUP}`);
  process.exit(1);
}
console.log(`Backup confirmed: ${BACKUP}`);

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Count first so we can verify before committing.
const { count, error: cErr } = await sb
  .from("questions")
  .select("id", { count: "exact", head: true })
  .eq("source", "pyq")
  .eq("language", "en")
  .is("centre_id", null);

if (cErr) { console.error("Count query failed:", cErr.message); process.exit(1); }
console.log(`Rows matching WHERE: ${count}`);

if (count !== 358) {
  console.error(`STOP — expected 358 rows, found ${count}. Not deleting. Investigate first.`);
  process.exit(1);
}

// Confirmed 358 — delete.
const { error: dErr } = await sb
  .from("questions")
  .delete()
  .eq("source", "pyq")
  .eq("language", "en")
  .is("centre_id", null);

if (dErr) { console.error("Delete failed:", dErr.message); process.exit(1); }

// Verify the rows are gone.
const { count: remaining, error: vErr } = await sb
  .from("questions")
  .select("id", { count: "exact", head: true })
  .eq("source", "pyq")
  .eq("language", "en")
  .is("centre_id", null);

if (vErr) { console.error("Post-delete verify failed:", vErr.message); process.exit(1); }

console.log(`Deleted: ${count} rows`);
console.log(`Remaining pyq/en rows: ${remaining}  (expected 0)`);
if (remaining !== 0) {
  console.error("WARNING — delete may not have completed fully.");
  process.exit(1);
}
console.log("STEP 4 complete ✓  Bank is now empty of pyq/en rows.");
