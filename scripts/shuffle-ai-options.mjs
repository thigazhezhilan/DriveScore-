/**
 * Fix answer-position bias: randomly shuffle the four options of every
 * AI-practice question so the correct answer is evenly spread across A/B/C/D.
 *
 * Operates on the docs/ai-*.csv source files AND the Supabase `questions`
 * table (source='ai') in one pass, applying the SAME permutation to both so
 * the repo and the live bank stay in sync. Only option ORDER changes — no
 * question text and no correctness is altered.
 *
 *   node scripts/shuffle-ai-options.mjs            (dry run: shows distribution)
 *   node scripts/shuffle-ai-options.mjs --apply    (rewrite CSVs + update DB)
 */

import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const LETTER = { A: 0, B: 1, C: 2, D: 3 };
const TOLET = ["A", "B", "C", "D"];
const COLS = ["subject", "chapter", "concept", "difficulty", "par_time_sec",
  "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"];

const Papa = (await import("papaparse")).default;
const docsDir = "docs";
const files = fs.readdirSync(docsDir).filter((f) => /^ai-.*\.csv$/.test(f));

function shuffled4() {
  const a = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const norm = (s) => (s || "").trim();
const updates = [];      // {subject, chapter, text, options, answerIndex}
const distBefore = { A: 0, B: 0, C: 0, D: 0 };
const distAfter = { A: 0, B: 0, C: 0, D: 0 };

for (const file of files) {
  const full = path.join(docsDir, file);
  const rows = Papa.parse(fs.readFileSync(full, "utf8"), { header: true, skipEmptyLines: "greedy" }).data;
  for (const r of rows) {
    const opts = [r.option_a, r.option_b, r.option_c, r.option_d];
    const oldIdx = LETTER[String(r.correct_option || "").trim().toUpperCase()];
    if (oldIdx === undefined) continue;
    distBefore[TOLET[oldIdx]]++;
    const perm = shuffled4();                       // perm[newPos] = oldPos
    const newOpts = perm.map((o) => opts[o]);
    const newIdx = perm.indexOf(oldIdx);            // where the correct option landed
    distAfter[TOLET[newIdx]]++;
    r.option_a = newOpts[0]; r.option_b = newOpts[1]; r.option_c = newOpts[2]; r.option_d = newOpts[3];
    r.correct_option = TOLET[newIdx];
    updates.push({ subject: norm(r.subject), chapter: norm(r.chapter), text: norm(r.question_text), options: newOpts, answerIndex: newIdx });
  }
  if (APPLY) fs.writeFileSync(full, Papa.unparse(rows, { columns: COLS }) + "\n");
}

console.log(`Files: ${files.length} | questions: ${updates.length}`);
console.log("Correct-option distribution BEFORE:", distBefore);
console.log("Correct-option distribution AFTER :", distAfter);

if (!APPLY) { console.log("\nDry run only. Re-run with --apply to rewrite CSVs and update the database."); process.exit(0); }

// ── update the live bank ──
const { createClient } = await import("@supabase/supabase-js");
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// fetch all AI questions and key them by subject|chapter|text
const existing = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("questions")
    .select("id, subject, chapter, text").is("centre_id", null).eq("source", "ai")
    .range(from, from + 999);
  if (error) { console.error("Fetch failed:", error.message); process.exit(1); }
  existing.push(...data);
  if (data.length < 1000) break;
}
const idByKey = new Map();
for (const q of existing) idByKey.set(`${q.subject}|${q.chapter}|${norm(q.text)}`, q.id);

let updated = 0, missing = 0;
for (const u of updates) {
  const id = idByKey.get(`${u.subject}|${u.chapter}|${u.text}`);
  if (!id) { missing++; continue; }
  const { error: e } = await sb.from("questions").update({ options: u.options, answer_index: u.answerIndex }).eq("id", id);
  if (e) { console.error("Update failed:", e.message); process.exit(1); }
  updated++;
}
console.log(`\nDB updated: ${updated} | not matched: ${missing}`);
