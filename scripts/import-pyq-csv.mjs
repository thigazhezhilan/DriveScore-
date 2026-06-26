/**
 * Import a PYQ (past-year question) CSV into the global bank as source='pyq'.
 *
 * Use this after running extract-neet.mjs and doing a human review pass on the
 * output. Every question inserted here becomes:
 *   - Part of the practice pool (status='live', centre_id=null)
 *   - A few-shot anchor for AI generation in its chapter
 *
 * Correctness matters more than volume. This script is strict:
 *   - Rejects rows with empty options or missing answer key
 *   - Rejects rows with chapter='Unclassified' (classify first)
 *   - Deduplicates against ALL existing global questions in the same chapter
 *     (body text normalised: alphanumeric only, first 60 chars)
 *   - Reports every row's disposition (imported / skipped-invalid / skipped-dupe)
 *
 * Usage:
 *   node scripts/import-pyq-csv.mjs docs/papers/neet-2023.csv
 *   node scripts/import-pyq-csv.mjs docs/papers/neet-2023.csv --dry-run
 *
 * Only language='en' is supported here. Tamil PYQ is a separate ingestion pass
 * with its own OCR + verification workflow.
 */

import fs from "node:fs";

const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const DIFFS = ["Easy", "Medium", "Hard"];
const LETTER = { A: 0, B: 1, C: 2, D: 3 };
const PAR = { Easy: 45, Medium: 60, Hard: 90 };

const isDryRun = process.argv.includes("--dry-run");
const csvFile = process.argv.find(
  (a) => !a.startsWith("--") && !a.endsWith(".mjs") && !a.includes("node"),
);
if (!csvFile) {
  console.error("usage: node scripts/import-pyq-csv.mjs <reviewed.csv> [--dry-run]");
  process.exit(1);
}

// ─── Env + DB ────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ─── Validation ───────────────────────────────────────────────────────────────

function validateRow(raw, rowNum) {
  const errors = [];
  const subject = SUBJECTS.find(
    (s) => s.toLowerCase() === String(raw.subject || "").trim().toLowerCase(),
  );
  const difficulty = DIFFS.find(
    (d) => d.toLowerCase() === String(raw.difficulty || "").trim().toLowerCase(),
  );
  const chapter = String(raw.chapter || "").trim();
  const concept = String(raw.concept || "").trim() || chapter;
  const text = String(raw.question_text || "").trim();
  const options = [raw.option_a, raw.option_b, raw.option_c, raw.option_d].map(
    (o) => String(o || "").trim(),
  );
  const answerIndex = LETTER[String(raw.correct_option || "").trim().toUpperCase()];
  const parTimeSec = Number(raw.par_time_sec) || 0;

  if (!subject) errors.push("invalid subject");
  if (!difficulty) errors.push("invalid difficulty");
  if (!chapter) errors.push("missing chapter");
  if (chapter === "Unclassified") errors.push("chapter=Unclassified — classify before importing");
  if (!text) errors.push("missing question_text");
  if (text.length < 8) errors.push("question_text too short");
  if (options.some((o) => !o)) errors.push(`empty option(s): ${options.map((o, i) => o ? "" : "ABCD"[i]).filter(Boolean).join(",")}`);
  if (new Set(options).size < 4) errors.push("duplicate options");
  if (answerIndex === undefined) errors.push("invalid correct_option (expected A/B/C/D)");

  if (errors.length) return { ok: false, errors, rowNum };
  return {
    ok: true,
    value: { subject, chapter, concept, difficulty, parTimeSec: parTimeSec || PAR[difficulty] || 60, text, options, answerIndex },
  };
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────

const Papa = (await import("papaparse")).default;
const rawRows = Papa.parse(fs.readFileSync(csvFile, "utf8"), {
  header: true,
  skipEmptyLines: "greedy",
  transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
}).data;

// ─── Validate ─────────────────────────────────────────────────────────────────

const valid = [];
const invalid = [];
rawRows.forEach((raw, i) => {
  const r = validateRow(raw, i + 2); // +2: 1-based + header row
  if (r.ok) valid.push(r.value);
  else invalid.push({ rowNum: r.rowNum, errors: r.errors, preview: String(raw.question_text || "").slice(0, 50) });
});

if (valid.length === 0) {
  console.error(`No valid rows found in ${csvFile}.`);
  invalid.forEach(({ rowNum, errors, preview }) =>
    console.error(`  row ${rowNum}: ${errors.join("; ")}  |  "${preview}"`),
  );
  process.exit(1);
}

// ─── Deduplication ────────────────────────────────────────────────────────────

// Normalise question body to catch minor formatting differences (whitespace,
// punctuation) between papers — enough to detect the same question reprinted.
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);

// Fetch existing global-bank bodies for every chapter we'll be touching.
const chapterKeys = [...new Set(valid.map((v) => `${v.subject}|${v.chapter}`))];
const seen = new Set();
for (const ck of chapterKeys) {
  const [subject, chapter] = ck.split("|");
  const { data, error } = await sb
    .from("questions")
    .select("body")
    .is("centre_id", null)
    .eq("subject", subject)
    .eq("chapter", chapter);
  if (error) {
    console.error(`DB error fetching chapter "${chapter}":`, error.message);
    process.exit(1);
  }
  (data || []).forEach((e) => seen.add(norm(e.body)));
}

const toInsert = [];
const dupes = [];
for (const v of valid) {
  const key = norm(v.text);
  if (seen.has(key)) {
    dupes.push(v);
    continue;
  }
  seen.add(key); // prevent double-insert within the same CSV
  toInsert.push({
    centre_id: null,
    language: "en",
    source: "pyq",
    status: "live",
    subject: v.subject,
    chapter: v.chapter,
    concept: v.concept,
    difficulty: v.difficulty,
    par_time_sec: v.parTimeSec,
    body: v.text,
    options: v.options,
    answer_index: v.answerIndex,
  });
}

// ─── Insert ───────────────────────────────────────────────────────────────────

let inserted = 0;
if (toInsert.length && !isDryRun) {
  const { data, error } = await sb.from("questions").insert(toInsert).select("id");
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  inserted = data?.length ?? 0;
} else if (isDryRun) {
  inserted = toInsert.length; // report what WOULD have been inserted
}

// ─── Report ───────────────────────────────────────────────────────────────────

const bySub = (arr, s) => arr.filter((v) => v.subject === s).length;

console.log(`\nPYQ import${isDryRun ? " (dry run)" : ""} — ${csvFile}`);
console.log(`  Parsed rows  : ${rawRows.length}`);
console.log(`  Invalid      : ${invalid.length}`);
console.log(`  Duplicates   : ${dupes.length}`);
console.log(`  ${isDryRun ? "Would insert" : "Inserted"}  : ${inserted}  (source=pyq, language=en, status=live)`);

if (inserted > 0) {
  const src = isDryRun ? toInsert : toInsert;
  console.log(`    Physics ${bySub(src, "Physics")} | Chemistry ${bySub(src, "Chemistry")} | Biology ${bySub(src, "Biology")}`);
}

if (invalid.length) {
  console.log(`\nInvalid rows (fix and re-run):`);
  invalid.forEach(({ rowNum, errors, preview }) =>
    console.log(`  row ${rowNum}: ${errors.join("; ")}  |  "${preview}"`),
  );
}

if (dupes.length) {
  console.log(`\nDuplicates skipped (already in global bank):`);
  dupes.forEach((v) => console.log(`  [${v.subject} / ${v.chapter}] ${v.text.slice(0, 60)}`));
}

if (isDryRun) {
  // Print a sample of rows so you can verify that the answer index (0-3)
  // actually maps to the option you expect (A=0, B=1, C=2, D=3).
  // A shifted index means every answer in the import is wrong — catch it here.
  if (toInsert.length > 0) {
    const SAMPLE = 5;
    const step = Math.max(1, Math.floor(toInsert.length / SAMPLE));
    const samples = [];
    for (let i = 0; i < toInsert.length && samples.length < SAMPLE; i += step) {
      samples.push(toInsert[i]);
    }

    console.log(`\nSampled rows — verify answer letter → option text before importing:`);
    for (const row of samples) {
      const opts = Array.isArray(row.options) ? row.options : [];
      const letter = ["A", "B", "C", "D"][row.answer_index] ?? "?";
      const optText = String(opts[row.answer_index] ?? "(missing)").slice(0, 65);
      console.log(`  [${row.subject}] ${row.chapter}`);
      console.log(`  Q: "${row.body.slice(0, 70)}"`);
      console.log(`  answer=${letter}  →  option[${row.answer_index}]: "${optText}"`);
      console.log();
    }
  }

  console.log(`Dry run complete — no rows were inserted.`);
  console.log(`Remove --dry-run to perform the actual import.`);
}
