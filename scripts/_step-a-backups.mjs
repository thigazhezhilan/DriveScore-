/**
 * STEP A — back up answers and attempts that reference the 358 pyq questions.
 * No deletes. Report counts only.
 */
import fs from "node:fs";

const BACKUP_Q = "docs/papers/pyq-backup-2026-06-21.csv";
if (!fs.existsSync(BACKUP_Q)) {
  console.error("ABORT — questions backup missing:", BACKUP_Q); process.exit(1);
}
console.log("Questions backup: ✓", BACKUP_Q);

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim()])
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── 1. Get the 358 pyq question IDs ──────────────────────────────────────────
const { data: qRows, error: qErr } = await sb
  .from("questions").select("id")
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (qErr) { console.error(qErr.message); process.exit(1); }
const qIds = qRows.map(r => r.id);
console.log(`pyq/en question IDs: ${qIds.length}`);

// ── 2. Fetch all answers rows in batches ─────────────────────────────────────
const answerRows = [];
for (let i = 0; i < qIds.length; i += 50) {
  const { data, error } = await sb
    .from("answers")
    .select("id, attempt_id, question_id, picked_index, time_sec, first_answer_index")
    .in("question_id", qIds.slice(i, i+50))
    .limit(500);
  if (error) { console.error("answers batch error:", error.message); process.exit(1); }
  answerRows.push(...(data ?? []));
}
console.log(`answers rows referencing pyq questions: ${answerRows.length}`);

// ── 3. Fetch all attempt rows referenced by those answers ────────────────────
const attemptIds = [...new Set(answerRows.map(r => r.attempt_id))];
const attemptRows = [];
for (let i = 0; i < attemptIds.length; i += 50) {
  const { data, error } = await sb
    .from("attempts")
    .select("id, mock_id, student_id, started_at, submitted_at, total_marks, max_marks, accuracy")
    .in("id", attemptIds.slice(i, i+50))
    .limit(200);
  if (error) { console.error("attempts batch error:", error.message); process.exit(1); }
  attemptRows.push(...(data ?? []));
}
console.log(`attempt rows referenced: ${attemptRows.length}`);

// ── 4. Write backup CSVs ─────────────────────────────────────────────────────
function toCSV(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = v => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,"\"\"") + '"' : s;
  };
  return [keys.join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\n") + "\n";
}

const ANSWERS_BACKUP  = "docs/papers/pyq-answers-backup-2026-06-21.csv";
const ATTEMPTS_BACKUP = "docs/papers/pyq-attempts-backup-2026-06-21.csv";
fs.writeFileSync(ANSWERS_BACKUP,  toCSV(answerRows));
fs.writeFileSync(ATTEMPTS_BACKUP, toCSV(attemptRows));

console.log(`\nBackups written:`);
console.log(`  ${ANSWERS_BACKUP}   (${answerRows.length} rows)`);
console.log(`  ${ATTEMPTS_BACKUP}  (${attemptRows.length} rows)`);
console.log(`\nSTEP A complete — no deletes performed.`);
