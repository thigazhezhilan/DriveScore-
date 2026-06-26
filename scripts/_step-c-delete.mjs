/**
 * STEP C — delete in FK order: answers → attempts → questions.
 * All scoped to the 358 pyq/en rows only. No schema changes.
 */
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim()])
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── 0. Collect the 358 question IDs (and the attempt IDs they pull in) ───────
const { data: qRows, error: qErr } = await sb
  .from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (qErr) { console.error("ID fetch failed:", qErr.message); process.exit(1); }
const qIds = qRows.map(r => r.id);
if (qIds.length !== 358) {
  console.error(`STOP — expected 358 question IDs, got ${qIds.length}.`); process.exit(1);
}
console.log(`Question IDs to delete: ${qIds.length}`);

// Collect answer rows + attempt IDs (same logic as Step A)
const answerIds = [];
const attemptIdSet = new Set();
for (let i = 0; i < qIds.length; i += 50) {
  const { data, error } = await sb
    .from("answers").select("id, attempt_id")
    .in("question_id", qIds.slice(i, i+50)).limit(500);
  if (error) { console.error("answers fetch:", error.message); process.exit(1); }
  (data ?? []).forEach(r => { answerIds.push(r.id); attemptIdSet.add(r.attempt_id); });
}
const attemptIds = [...attemptIdSet];
console.log(`Answers to delete : ${answerIds.length}  (expect 3,576)`);
console.log(`Attempts to delete: ${attemptIds.length}  (expect 1,523)`);

// ── 1. Delete answers ─────────────────────────────────────────────────────────
let deletedAnswers = 0;
for (let i = 0; i < answerIds.length; i += 100) {
  const { error } = await sb
    .from("answers").delete()
    .in("id", answerIds.slice(i, i+100));
  if (error) { console.error(`answers delete batch ${i}:`, error.message); process.exit(1); }
  deletedAnswers += Math.min(100, answerIds.length - i);
}
// Verify
const { count: answersRemaining } = await sb
  .from("answers").select("id", { count:"exact", head:true })
  .in("question_id", qIds);
console.log(`\n1. Answers deleted : ${deletedAnswers}   remaining referencing pyq: ${answersRemaining ?? "?"}`);
if (answersRemaining !== 0) {
  console.error("STOP — answers not fully deleted."); process.exit(1);
}

// ── 2. Delete attempts ────────────────────────────────────────────────────────
let deletedAttempts = 0;
for (let i = 0; i < attemptIds.length; i += 100) {
  const { error } = await sb
    .from("attempts").delete()
    .in("id", attemptIds.slice(i, i+100));
  if (error) { console.error(`attempts delete batch ${i}:`, error.message); process.exit(1); }
  deletedAttempts += Math.min(100, attemptIds.length - i);
}
console.log(`2. Attempts deleted: ${deletedAttempts}`);

// ── 3. Delete questions ───────────────────────────────────────────────────────
const { error: delQErr } = await sb
  .from("questions").delete()
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (delQErr) { console.error("questions delete failed:", delQErr.message); process.exit(1); }

// Verify questions gone
const { count: qRemaining } = await sb
  .from("questions").select("id", { count:"exact", head:true })
  .eq("source","pyq").eq("language","en").is("centre_id",null);
console.log(`3. Questions deleted: 358   remaining: ${qRemaining ?? "?"}`);
if (qRemaining !== 0) {
  console.error(`STOP — ${qRemaining} pyq/en questions remain. Did not delete all 358.`);
  process.exit(1);
}

// ── 4. Confirm AI bank is untouched ──────────────────────────────────────────
const { count: aiCount } = await sb
  .from("questions").select("id", { count:"exact", head:true })
  .eq("source","ai").is("centre_id",null);
console.log(`\nAI bank row count: ${aiCount}   (expect 3,604)`);
if (aiCount !== 3604) {
  console.error(`STOP — AI row count changed to ${aiCount}. Investigate immediately.`);
  process.exit(1);
}

console.log(`\nSTEP C complete ✓`);
console.log(`  Answers deleted  : ${deletedAnswers}`);
console.log(`  Attempts deleted : ${deletedAttempts}`);
console.log(`  Questions deleted: 358`);
console.log(`  AI rows          : 3,604  (unchanged)`);
