/**
 * Import an AI-question CSV into the bank as source='ai' (no Anthropic API).
 *
 * Use this for in-chat-generated batches (the assistant writes the questions,
 * you inject them) — same CSV columns as the past-paper template. Validates
 * each row with the shared validator, dedupes against the chapter, inserts.
 *
 *   node scripts/import-ai-csv.mjs docs/ai-physics-current-electricity.csv
 */

import fs from "node:fs";

const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const DIFFS = ["Easy", "Medium", "Hard"];
const LETTER = { A: 0, B: 1, C: 2, D: 3 };

/** Light validator (same rules as the app's validateRow, inlined for node). */
function validateRow(raw) {
  const subject = SUBJECTS.find((s) => s.toLowerCase() === String(raw.subject || "").trim().toLowerCase());
  const difficulty = DIFFS.find((d) => d.toLowerCase() === String(raw.difficulty || "").trim().toLowerCase());
  const chapter = String(raw.chapter || "").trim();
  const concept = String(raw.concept || "").trim() || chapter;
  const text = String(raw.question_text || "").trim();
  const options = [raw.option_a, raw.option_b, raw.option_c, raw.option_d].map((o) => String(o || "").trim());
  const answerIndex = LETTER[String(raw.correct_option || "").trim().toUpperCase()];
  const parTimeSec = Number(raw.par_time_sec) || 0;
  const errors = [];
  if (!subject) errors.push("subject");
  if (!difficulty) errors.push("difficulty");
  if (!chapter) errors.push("chapter");
  if (!text) errors.push("question_text");
  if (options.some((o) => !o)) errors.push("options");
  if (answerIndex === undefined) errors.push("correct_option");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { subject, chapter, concept, difficulty, parTimeSec, text, options, answerIndex } };
}

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/import-ai-csv.mjs <file.csv>"); process.exit(1); }

const Papa = (await import("papaparse")).default;
const { createClient } = await import("@supabase/supabase-js");
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const PAR = { Easy: 45, Medium: 60, Hard: 90 };
const rows = Papa.parse(fs.readFileSync(file, "utf8"), {
  header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase(),
}).data;

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 45);

const valid = [];
const skipped = [];
rows.forEach((raw, i) => {
  const r = validateRow(raw);
  if (r.ok) valid.push(r.value);
  else skipped.push(`row ${i + 1}: ${r.errors.join("; ")}`);
});
if (valid.length === 0) { console.error("No valid rows.", skipped); process.exit(1); }

// dedupe vs existing questions in those chapters
const chapters = [...new Set(valid.map((v) => `${v.subject}|${v.chapter}`))];
const seen = new Set();
for (const ck of chapters) {
  const [subject, chapter] = ck.split("|");
  const { data } = await sb.from("questions").select("text")
    .is("centre_id", null).eq("subject", subject).eq("chapter", chapter);
  (data || []).forEach((e) => seen.add(norm(e.text)));
}

const toInsert = [];
const dupes = [];
for (const v of valid) {
  if (seen.has(norm(v.text))) { dupes.push(v.text.slice(0, 45)); continue; }
  seen.add(norm(v.text));
  toInsert.push({
    centre_id: null, source: "ai", hidden: false,
    subject: v.subject, chapter: v.chapter, concept: v.concept,
    difficulty: v.difficulty, par_time_sec: v.parTimeSec || PAR[v.difficulty] || 60,
    text: v.text, options: v.options, answer_index: v.answerIndex,
  });
}

let inserted = 0;
if (toInsert.length) {
  const { data, error } = await sb.from("questions").insert(toInsert).select("id");
  if (error) { console.error("Insert failed:", error.message); process.exit(1); }
  inserted = data?.length ?? 0;
}

console.log(`Valid ${valid.length} · inserted ${inserted} (source=ai) · dupes ${dupes.length} · invalid ${skipped.length}`);
if (skipped.length) skipped.forEach((s) => console.log("  invalid " + s));
if (dupes.length) dupes.forEach((d) => console.log("  dupe " + d));
