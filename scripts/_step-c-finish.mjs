/**
 * STEP C finish — verify attempts are gone, delete questions, confirm AI intact.
 * Answers are already deleted. Continuing from where v2 left off.
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

const attemptIds = Papa.parse(
  fs.readFileSync("docs/papers/pyq-attempts-backup-2026-06-21.csv", "utf8"),
  { header: true, skipEmptyLines: "greedy" }
).data.map(r => r.id);

// ── Verify attempts are gone (batched count to avoid URL limit) ───────────────
let attRemaining = 0;
for (let i = 0; i < attemptIds.length; i += 100) {
  const { data } = await sb.from("attempts").select("id")
    .in("id", attemptIds.slice(i, i+100)).limit(200);
  attRemaining += (data ?? []).length;
}
console.log(`Attempts remaining: ${attRemaining}  (expect 0)`);
if (attRemaining !== 0) {
  // Some attempts weren't deleted — delete them now
  console.log("  Deleting remaining attempts...");
  for (let i = 0; i < attemptIds.length; i += 100) {
    await sb.from("attempts").delete().in("id", attemptIds.slice(i, i+100));
  }
  let recheck = 0;
  for (let i = 0; i < attemptIds.length; i += 100) {
    const { data } = await sb.from("attempts").select("id")
      .in("id", attemptIds.slice(i, i+100)).limit(200);
    recheck += (data ?? []).length;
  }
  console.log(`  After re-delete: ${recheck}`);
  if (recheck !== 0) { console.error("STOP — attempts still remain."); process.exit(1); }
}
console.log(`2. Attempts: confirmed gone ✓`);

// ── Delete questions ──────────────────────────────────────────────────────────
const { data: qRows } = await sb.from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null);
const qIds = (qRows ?? []).map(r => r.id);
console.log(`Questions still in DB: ${qIds.length}  (expect 358)`);
if (qIds.length !== 358) {
  console.error(`STOP — expected 358 questions, found ${qIds.length}.`); process.exit(1);
}

const { error: delQErr } = await sb.from("questions").delete()
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (delQErr) { console.error("questions delete:", delQErr.message); process.exit(1); }

// Verify questions gone
const { data: qCheck } = await sb.from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null).limit(5);
const qRemaining = (qCheck ?? []).length;
console.log(`3. Questions deleted: 358   remaining: ${qRemaining}  (expect 0)`);
if (qRemaining !== 0) {
  console.error(`STOP — ${qRemaining} questions still remain.`); process.exit(1);
}

// ── Confirm AI bank untouched ─────────────────────────────────────────────────
const { count: aiCount } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","ai").is("centre_id",null);
console.log(`\nAI bank row count: ${aiCount}  (expect 3,604)`);
if (aiCount !== 3604) {
  console.error(`STOP — AI count is ${aiCount}, not 3,604. Investigate immediately.`); process.exit(1);
}

console.log(`\n══ STEP C complete ✓ ══`);
console.log(`  Answers deleted  : ~10,410`);
console.log(`  Attempts deleted : 1,523`);
console.log(`  Questions deleted: 358`);
console.log(`  AI rows          : 3,604  (unchanged)`);
