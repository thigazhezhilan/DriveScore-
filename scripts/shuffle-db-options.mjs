/**
 * Fix answer-position bias directly in the live bank: randomly permute the four
 * options of every source='ai' question and update answer_index to match, so the
 * correct choice is evenly spread across A/B/C/D. Only option ORDER changes — the
 * question text and which option is correct are preserved.
 *
 * Unlike shuffle-ai-options.mjs (which is driven by docs/ai-*.csv), this operates
 * straight on the DB, so it also covers questions inserted from JSON.
 *
 *   node scripts/shuffle-db-options.mjs [Subject]            (dry run: show distribution)
 *   node scripts/shuffle-db-options.mjs [Subject] --apply    (rewrite the DB)
 */
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const SUBJECT = process.argv.find((a) => /^(Physics|Chemistry|Biology)$/.test(a)) || null;
const TOLET = ["A", "B", "C", "D"];

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function shuffled4() {
  const a = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// fetch all matching AI questions
const all = [];
for (let from = 0; ; from += 1000) {
  let q = sb.from("questions").select("id, options, answer_index, subject")
    .is("centre_id", null).eq("source", "ai").range(from, from + 999);
  if (SUBJECT) q = q.eq("subject", SUBJECT);
  const { data, error } = await q;
  if (error) { console.error("Fetch failed:", error.message); process.exit(1); }
  all.push(...data);
  if (data.length < 1000) break;
}

const before = { A: 0, B: 0, C: 0, D: 0 };
const after = { A: 0, B: 0, C: 0, D: 0 };
const updates = [];
for (const r of all) {
  const opts = Array.isArray(r.options) ? r.options : [];
  if (opts.length !== 4 || !(r.answer_index >= 0 && r.answer_index <= 3)) continue;
  before[TOLET[r.answer_index]]++;
  const perm = shuffled4();                 // perm[newPos] = oldPos
  const newOpts = perm.map((o) => opts[o]);
  const newIdx = perm.indexOf(r.answer_index);
  after[TOLET[newIdx]]++;
  updates.push({ id: r.id, options: newOpts, answer_index: newIdx });
}

console.log(`AI questions${SUBJECT ? ` (${SUBJECT})` : ""}: ${all.length}`);
console.log("Correct-option BEFORE:", before);
console.log("Correct-option AFTER :", after);
if (!APPLY) { console.log("\nDry run. Re-run with --apply to update the DB."); process.exit(0); }

let updated = 0;
for (const u of updates) {
  const { error } = await sb.from("questions").update({ options: u.options, answer_index: u.answer_index }).eq("id", u.id);
  if (error) { console.error("Update failed:", error.message); process.exit(1); }
  updated++;
  if (updated % 100 === 0) console.log(`  …${updated}/${updates.length}`);
}
console.log(`DB updated: ${updated}`);
