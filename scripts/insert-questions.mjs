/**
 * Insert hand-authored AI-practice questions from a JSON file into the global
 * bank (centre_id=null, source='ai', hidden=false) — the live AI-Practice pool.
 *
 * Each JSON item: {
 *   subject?: "Physics"|"Chemistry"|"Biology"   (default "Physics")
 *   chapter:  string   (must be an exact NCERT chapter name)
 *   difficulty: "Easy"|"Medium"|"Hard"
 *   concept:  string
 *   text:     string
 *   options:  [string, string, string, string]
 *   answer:   number 0..3  OR  "A"|"B"|"C"|"D"
 * }
 *
 * Validates every row (4 distinct non-empty options, valid answer, allowed enums,
 * no "all/none of the above"), de-dupes against questions already in that chapter
 * (any source), then bulk-inserts the survivors. Skipped rows are reported with a
 * reason. Idempotent: re-running the same file inserts nothing new (dedupe).
 *
 * Usage: node scripts/insert-questions.mjs <file.json>
 */

import fs from "node:fs";
import { CHAPTERS } from "./ncert-classify.mjs";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/insert-questions.mjs <file.json>"); process.exit(1); }

const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const DIFFS = ["Easy", "Medium", "Hard"];
const PAR = { Easy: 45, Medium: 60, Hard: 90 };
const LETTER = { A: 0, B: 1, C: 2, D: 3 };
// Full-text normalisation (not a short prefix) so questions that share a common
// stem — e.g. "Which pair of quantities has the same dimensions?" — are NOT
// treated as duplicates of one another.
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// ── env + client ──
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── load + validate ──
let items;
try { items = JSON.parse(fs.readFileSync(file, "utf8")); }
catch (e) { console.error(`Bad JSON in ${file}: ${e.message}`); process.exit(1); }
if (!Array.isArray(items)) { console.error("JSON root must be an array."); process.exit(1); }

// Pre-fetch existing texts per chapter touched by this file (for dedupe).
const chaptersInFile = [...new Set(items.map((i) => i.chapter))];
const seenByChapter = new Map();
for (const ch of chaptersInFile) {
  const { data } = await sb.from("questions").select("text")
    .is("centre_id", null).eq("chapter", ch);
  seenByChapter.set(ch, new Set((data || []).map((r) => norm(r.text))));
}

const rows = [];
const skipped = [];
items.forEach((q, idx) => {
  const where = `#${idx + 1} "${String(q.text || "").slice(0, 40)}…"`;
  const subject = SUBJECTS.find((s) => s.toLowerCase() === String(q.subject || "Physics").toLowerCase());
  const difficulty = DIFFS.find((d) => d.toLowerCase() === String(q.difficulty || "").toLowerCase());
  const opts = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
  const ans = typeof q.answer === "number" ? q.answer : LETTER[String(q.answer || "").toUpperCase()];

  if (!subject) return skipped.push(`${where} — bad subject`);
  if (!difficulty) return skipped.push(`${where} — bad difficulty`);
  if (!q.chapter || !CHAPTERS[subject]?.some((c) => c === q.chapter)) return skipped.push(`${where} — chapter not an NCERT ${subject} chapter`);
  if (!q.text) return skipped.push(`${where} — empty text`);
  if (opts.length !== 4 || opts.some((o) => !o)) return skipped.push(`${where} — needs exactly 4 non-empty options`);
  if (new Set(opts.map((o) => o.toLowerCase())).size !== 4) return skipped.push(`${where} — duplicate options`);
  if (opts.some((o) => /all of the above|none of the above/i.test(o))) return skipped.push(`${where} — ambiguous option`);
  if (!(ans >= 0 && ans <= 3)) return skipped.push(`${where} — answer must be 0..3 or A..D`);

  const seen = seenByChapter.get(q.chapter);
  if (seen.has(norm(q.text))) return skipped.push(`${where} — duplicate of existing question`);
  seen.add(norm(q.text)); // also dedupe within this file

  rows.push({
    centre_id: null, source: "ai", hidden: false,
    subject, chapter: q.chapter, concept: String(q.concept || q.chapter).slice(0, 120),
    difficulty, par_time_sec: PAR[difficulty],
    text: q.text, options: opts, answer_index: ans,
  });
});

// ── insert ──
let inserted = 0;
if (rows.length) {
  const { data, error } = await sb.from("questions").insert(rows).select("id");
  if (error) { console.error("Insert failed:", error.message); process.exit(1); }
  inserted = data?.length ?? 0;
}

console.log(`Loaded ${items.length} · inserted ${inserted} · skipped ${skipped.length}`);
if (skipped.length) { console.log("Skipped:"); skipped.forEach((s) => console.log("  - " + s)); }
