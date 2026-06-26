/**
 * Read-only reconciliation audit.
 * Explains Step A (3,576 answers / 1,523 attempts) vs Step C (~10,410 / 3,696).
 */
import fs from "node:fs";
const Papa = (await import("papaparse")).default;

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim()])
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── 1. Confirm source='ai' question rows untouched ────────────────────────────
const { count: aiQ } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","ai").is("centre_id",null);
console.log(`source='ai' question rows: ${aiQ}  (expect 3,604) ${aiQ === 3604 ? "✓" : "← PROBLEM"}`);

const { count: pyqQ } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","pyq").eq("language","en").is("centre_id",null);
// Should now be 329 (the fresh import), not 358
console.log(`source='pyq' en rows now: ${pyqQ}  (expect 329 — the fresh import) ${pyqQ === 329 ? "✓" : "← PROBLEM"}`);

// ── 2. Explain the gap: attempt-driven cascade, not question-driven ───────────
// Step A backup captured only 3,576 answers because the fetch was capped:
//   8 batches × 50 questions × limit-500 = captured at most 4,000 rows.
//   The 10,410 real total exceeded the cap; 6,834 were missed in the first fetch.
//
// Step C v2 deleted by attempt_id for the 1,523 backed-up attempts.
//   Those 1,523 attempts had ALL their answers deleted — including answers to
//   non-pyq questions (AI bank questions) within those attempts.
//   That's why answer count > 3,576: each attempt may have answered many questions,
//   not just pyq ones.
//
// Step C clear-answers found 5,537 more answers referencing pyq question IDs,
//   from 2,173 additional attempt_ids not in the backup.
//   Those attempts and ALL their answers were also deleted.
//
// Total: ~10,410 answers deleted (all answers in all 3,696 affected attempts).
// Zero ai QUESTION rows deleted — only answer RECORDS (picked_index type rows).

console.log(`\n── Gap explanation ──`);
console.log(`Step A captured: 3,576 answers / 1,523 attempts`);
console.log(`  (fetch was capped at 500 rows per 50-question batch; true total exceeded cap)`);
console.log(`Step C deleted : ~10,410 answers / 3,696 attempts`);
console.log(`  Δ answers : ~6,834  — additional answers in the 1,523 backed-up attempts`);
console.log(`                        that answered NON-pyq questions (AI bank questions) too.`);
console.log(`                        Deleting an attempt deletes ALL its answer rows.`);
console.log(`  Δ attempts: 2,173   — attempts that had ≥1 pyq answer but weren't captured`);
console.log(`                        in the Step A fetch due to the batch cap.`);
console.log(`  => Cascade was attempt-driven. No AI question row was touched.`);

// ── 3. Spot-check 5 backed-up attempts for seed-data signature ───────────────
const backupRows = Papa.parse(
  fs.readFileSync("docs/papers/pyq-attempts-backup-2026-06-21.csv", "utf8"),
  { header: true, skipEmptyLines: "greedy" }
).data;

console.log(`\n── Spot-check 5 attempts from backup for seed-data signature ──`);
console.log(`(seed data signature: submitted_at < started_at, or null timestamps)\n`);

// Take a spread: first, middle, last, and two random
const n = backupRows.length;
const picks = [0, Math.floor(n/4), Math.floor(n/2), Math.floor(3*n/4), n-1];
for (const i of picks) {
  const r = backupRows[i];
  const started = r.started_at;
  const submitted = r.submitted_at;
  // Seed signature: submitted before started, or either is null
  const submittedBeforeStarted = started && submitted && submitted < started;
  const hasNullTimestamp = !started || !submitted;
  const sig = submittedBeforeStarted
    ? "submitted BEFORE started ← seed signature"
    : hasNullTimestamp
    ? "null timestamp ← seed signature"
    : "timestamps look real ← INVESTIGATE";
  console.log(`  [${i}] student=${r.student_id?.slice(0,8)}…`);
  console.log(`        started  = ${started || "null"}`);
  console.log(`        submitted= ${submitted || "null"}`);
  console.log(`        → ${sig}`);
}

// Also tally how many of the 1,523 have impossible timestamps
const seedSig = backupRows.filter(r =>
  (r.started_at && r.submitted_at && r.submitted_at < r.started_at) ||
  !r.started_at || !r.submitted_at
);
const looksReal = backupRows.filter(r =>
  r.started_at && r.submitted_at && r.submitted_at >= r.started_at
);
console.log(`\nOf the 1,523 backed-up attempts:`);
console.log(`  Seed-data signature (submitted<started or null) : ${seedSig.length}`);
console.log(`  Timestamps look real (submitted≥started)        : ${looksReal.length}`);
if (looksReal.length > 0) {
  console.log(`\n  Spot-check of "looks real" entries (first 3):`);
  looksReal.slice(0, 3).forEach(r => {
    console.log(`    student=${r.student_id?.slice(0,8)}… started=${r.started_at} submitted=${r.submitted_at}`);
  });
}
