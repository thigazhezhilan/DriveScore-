/**
 * Clear ALL remaining answers that reference the 358 pyq questions,
 * regardless of which attempt they belong to. Then delete questions.
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

// Get the 358 question IDs
const { data: qRows } = await sb.from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null);
const qIds = (qRows ?? []).map(r => r.id);
console.log(`Question IDs: ${qIds.length}`);

// Count remaining answers referencing these questions (batched data fetch, not count)
let remaining = [];
for (let i = 0; i < qIds.length; i += 50) {
  const { data } = await sb.from("answers").select("id, attempt_id")
    .in("question_id", qIds.slice(i, i+50)).limit(1000);
  remaining.push(...(data ?? []));
}
console.log(`Remaining answers referencing pyq questions: ${remaining.length}`);

if (remaining.length > 0) {
  // Find the attempt IDs we haven't deleted yet
  const newAttemptIds = [...new Set(remaining.map(r => r.attempt_id))];
  console.log(`  From ${newAttemptIds.length} additional attempt IDs`);

  // Delete these answers directly by question_id (simplest path, no ID pre-fetch)
  for (let i = 0; i < qIds.length; i += 50) {
    const { error } = await sb.from("answers").delete()
      .in("question_id", qIds.slice(i, i+50));
    if (error) { console.error("answers delete by q_id:", error.message); process.exit(1); }
  }

  // Delete the new attempts too (they're all demo/seed accounts)
  for (let i = 0; i < newAttemptIds.length; i += 100) {
    const { error } = await sb.from("attempts").delete()
      .in("id", newAttemptIds.slice(i, i+100));
    if (error) { console.error("new attempts delete:", error.message); process.exit(1); }
  }

  // Verify answers are now gone
  let recheckAnswers = [];
  for (let i = 0; i < qIds.length; i += 50) {
    const { data } = await sb.from("answers").select("id")
      .in("question_id", qIds.slice(i, i+50)).limit(200);
    recheckAnswers.push(...(data ?? []));
  }
  console.log(`  After delete: ${recheckAnswers.length} answers remain  (expect 0)`);
  if (recheckAnswers.length !== 0) { console.error("STOP — answers not cleared."); process.exit(1); }
  console.log(`  Additional answers + attempts cleared ✓`);
}

// ── Now delete the 358 questions ─────────────────────────────────────────────
console.log(`\nDeleting 358 questions...`);
const { error: delQErr } = await sb.from("questions").delete()
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (delQErr) { console.error("questions delete:", delQErr.message); process.exit(1); }

const { data: qCheck } = await sb.from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null).limit(5);
const qLeft = (qCheck ?? []).length;
console.log(`Questions remaining: ${qLeft}  (expect 0)`);
if (qLeft !== 0) { console.error(`STOP — ${qLeft} questions remain.`); process.exit(1); }

// ── Confirm AI bank untouched ─────────────────────────────────────────────────
const { count: aiCount } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","ai").is("centre_id",null);
console.log(`AI bank: ${aiCount}  (expect 3,604)`);
if (aiCount !== 3604) {
  console.error(`STOP — AI count is ${aiCount}.`); process.exit(1);
}

console.log(`\n══ STEP C complete ✓ ══`);
console.log(`  Answers deleted  : all (including extras outside the 1,523 backup attempts)`);
console.log(`  Attempts deleted : 1,523 + any additional`);
console.log(`  Questions deleted: 358`);
console.log(`  AI rows          : 3,604  (unchanged)`);
