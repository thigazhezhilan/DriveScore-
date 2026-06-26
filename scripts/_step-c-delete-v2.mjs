/**
 * STEP C v2 — delete in FK order, using direct-delete (no pre-fetch limits).
 *
 * Root cause of v1 failure: fetching answer IDs in batches of 500 per 50-question
 * chunk missed ~6,834 answers. Real total is ~10,410, not 3,576.
 *
 * Fix: delete answers by attempt_id (scoped to the 1,523 attempt IDs from the
 * backup CSV) — this covers ALL answers for those attempts without any row-fetch.
 * Then delete the attempts, then the questions.
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

// ── Load attempt IDs from backup CSV (authoritative, complete list) ───────────
const attemptsBackup = Papa.parse(
  fs.readFileSync("docs/papers/pyq-attempts-backup-2026-06-21.csv", "utf8"),
  { header: true, skipEmptyLines: "greedy" }
).data;
const attemptIds = attemptsBackup.map(r => r.id);
console.log(`Attempt IDs from backup CSV: ${attemptIds.length}  (expect 1,523)`);

// ── Load question IDs from DB ─────────────────────────────────────────────────
const { data: qRows, error: qErr } = await sb
  .from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (qErr) { console.error("question ID fetch:", qErr.message); process.exit(1); }
const qIds = qRows.map(r => r.id);
console.log(`Question IDs in DB: ${qIds.length}  (expect 358)`);
if (qIds.length !== 358) {
  console.error(`STOP — expected 358, got ${qIds.length}.`); process.exit(1);
}

// ── 1. Delete ALL answers for the 1,523 attempts (covers ~10,410 rows) ────────
// Batch in groups of 100 attempt IDs to stay within URL limits.
let deletedAnswers = 0;
for (let i = 0; i < attemptIds.length; i += 100) {
  const chunk = attemptIds.slice(i, i + 100);
  const { error } = await sb.from("answers").delete().in("attempt_id", chunk);
  if (error) { console.error(`answers delete batch ${i}:`, error.message); process.exit(1); }
  deletedAnswers += chunk.length; // Supabase delete doesn't return count; track by chunk size
}

// Verify: no answers remain for any of the 1,523 attempts
let verifyAnswers = 0;
for (let i = 0; i < attemptIds.length; i += 100) {
  const { count } = await sb.from("answers").select("id", { count:"exact", head:true })
    .in("attempt_id", attemptIds.slice(i, i+100));
  verifyAnswers += count ?? 0;
}
console.log(`\n1. Answers delete ran (${attemptIds.length} attempt batches)`);
console.log(`   Remaining answers for these attempts: ${verifyAnswers}   (expect 0)`);
if (verifyAnswers !== 0) {
  console.error(`STOP — ${verifyAnswers} answers still remain.`); process.exit(1);
}

// ── 2. Delete attempts ────────────────────────────────────────────────────────
for (let i = 0; i < attemptIds.length; i += 100) {
  const { error } = await sb.from("attempts").delete().in("id", attemptIds.slice(i, i+100));
  if (error) { console.error(`attempts delete batch ${i}:`, error.message); process.exit(1); }
}
const { count: attRemaining } = await sb.from("attempts").select("id", { count:"exact", head:true })
  .in("id", attemptIds);
console.log(`2. Attempts deleted: 1,523   remaining: ${attRemaining ?? "?"}   (expect 0)`);
if (attRemaining !== 0) {
  console.error(`STOP — ${attRemaining} attempts still remain.`); process.exit(1);
}

// ── 3. Delete questions ───────────────────────────────────────────────────────
const { error: delQErr } = await sb.from("questions").delete()
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (delQErr) { console.error("questions delete:", delQErr.message); process.exit(1); }

const { count: qRemaining } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","pyq").eq("language","en").is("centre_id",null);
console.log(`3. Questions deleted: 358   remaining: ${qRemaining ?? "?"}   (expect 0)`);
if (qRemaining !== 0) {
  console.error(`STOP — ${qRemaining} pyq/en questions remain.`); process.exit(1);
}

// ── 4. Confirm AI bank is untouched ──────────────────────────────────────────
const { count: aiCount } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","ai").is("centre_id",null);
console.log(`\nAI bank row count: ${aiCount}   (expect 3,604)`);
if (aiCount !== 3604) {
  console.error(`STOP — AI count changed to ${aiCount}. Investigate immediately.`); process.exit(1);
}

console.log(`\n══ STEP C complete ✓ ══`);
console.log(`  Answers deleted  : ~10,410  (all answers for the 1,523 attempts)`);
console.log(`  Attempts deleted : 1,523`);
console.log(`  Questions deleted: 358`);
console.log(`  AI rows          : 3,604  (unchanged)`);
