/**
 * Insert NEET diagram questions as status='draft' — Step 3 of the diagram lane.
 *
 * Reads <paper>.needs-image.csv (or the old review.csv, auto-filtered for
 * reason="figure/parse" rows) and inserts each question with:
 *   - status = 'draft'   → invisible to students
 *   - image_url = null   → no image yet; attached in step 4 via promote script
 *   - source = 'pyq', language = 'en', centre_id = null
 *
 * After a successful insert, writes <csvStem>-draft-ids.json mapping
 * q_no → DB row id, which promote-diagram-pyq.mjs needs to flip the status.
 *
 * Deduplicates against existing global-bank rows in the same chapter (same
 * normalised-body check as import-pyq-csv.mjs). A row already in the bank as
 * draft or live is skipped.
 *
 * Usage:
 *   node scripts/import-diagram-pyq.mjs docs/papers/neet-2015.needs-image.csv
 *   node scripts/import-diagram-pyq.mjs docs/papers/neet-2015.review.csv   # auto-filters figures
 *   node scripts/import-diagram-pyq.mjs docs/papers/neet-2015.needs-image.csv --dry-run
 */

import fs from "node:fs";
import path from "node:path";

const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 };
const PAR_DEFAULT = 90; // diagram questions default to the Hard par time

const isDryRun = process.argv.includes("--dry-run");
const csvFile = process.argv.find(
  (a) => !a.startsWith("--") && !a.endsWith(".mjs") && !a.includes("node"),
);
if (!csvFile) {
  console.error("usage: node scripts/import-diagram-pyq.mjs <paper.needs-image.csv> [--dry-run]");
  process.exit(1);
}

// The draft-ids map goes next to the CSV (or needs-image file)
const draftIdsPath = csvFile
  .replace(/\.(needs-image|review)\.csv$/i, "")
  + "-draft-ids.json";

// ── Env + DB ─────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── Parse CSV ─────────────────────────────────────────────────────────────────

const Papa = (await import("papaparse")).default;
const allRows = Papa.parse(fs.readFileSync(csvFile, "utf8"), {
  header: true,
  skipEmptyLines: "greedy",
  transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
}).data;

// Accept both the new needs-image.csv format and the old review.csv format.
const rows = allRows.filter((r) => {
  if ("reason" in r) return r.reason === "figure/parse";
  return true;
}).filter((r) => r.q_no && r.correct_option && r.subject);

if (rows.length === 0) {
  console.error(`No usable figure-question rows found in ${csvFile}`);
  process.exit(1);
}

// ── Validate rows ─────────────────────────────────────────────────────────────

const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const valid = [];
const invalid = [];

for (const r of rows) {
  const subject = SUBJECTS.find(
    (s) => s.toLowerCase() === String(r.subject || "").trim().toLowerCase(),
  );
  const chapter = String(r.chapter || "").trim();
  const answerIndex = ANSWER_INDEX[String(r.correct_option || "").trim().toUpperCase()];
  const qNo = Number(r.q_no);
  const errors = [];

  if (!subject) errors.push("invalid subject");
  if (!chapter || chapter === "Unclassified") errors.push("missing/unclassified chapter");
  if (answerIndex === undefined) errors.push("invalid correct_option");
  if (!qNo) errors.push("missing q_no");

  if (errors.length) {
    invalid.push({ qNo: qNo || r.q_no, errors });
    continue;
  }

  const options = [
    String(r.option_a || "").trim(),
    String(r.option_b || "").trim(),
    String(r.option_c || "").trim(),
    String(r.option_d || "").trim(),
  ];

  valid.push({
    qNo,
    subject,
    chapter,
    concept: chapter,
    difficulty: (["Easy", "Medium", "Hard"].includes(r.difficulty) ? r.difficulty : null) || "Hard",
    parTimeSec: Number(r.par_time_sec) || PAR_DEFAULT,
    stem: String(r.question_text || "").trim(),
    options,
    answerIndex,
    page: Number(r.page) || null,
  });
}

if (invalid.length) {
  console.warn(`\nInvalid rows (skipped):`);
  invalid.forEach(({ qNo, errors }) => console.warn(`  Q${qNo}: ${errors.join("; ")}`));
}

// ── Deduplication ─────────────────────────────────────────────────────────────
// Check both body (question stem) and image_url=IS NULL to avoid re-inserting
// an existing draft. Normalise the stem the same way import-pyq-csv.mjs does.

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);

const chapterKeys = [...new Set(valid.map((v) => `${v.subject}|${v.chapter}`))];
const seenBodies = new Set();

for (const ck of chapterKeys) {
  const [subject, chapter] = ck.split("|");
  const { data, error } = await sb
    .from("questions")
    .select("body")
    .is("centre_id", null)
    .eq("subject", subject)
    .eq("chapter", chapter);
  if (error) { console.error("DB error:", error.message); process.exit(1); }
  (data || []).forEach((e) => seenBodies.add(norm(e.body)));
}

const toInsert = [];
const dupes = [];
for (const v of valid) {
  const key = norm(v.stem);
  if (seenBodies.has(key)) { dupes.push(v); continue; }
  seenBodies.add(key);
  toInsert.push(v);
}

// ── Insert ────────────────────────────────────────────────────────────────────

let inserted = 0;
const draftIds = {}; // q_no → db_id

if (toInsert.length && !isDryRun) {
  const payload = toInsert.map((v) => ({
    centre_id:    null,
    language:     "en",
    source:       "pyq",
    status:       "draft",
    subject:      v.subject,
    chapter:      v.chapter,
    concept:      v.concept,
    difficulty:   v.difficulty,
    par_time_sec: v.parTimeSec,
    body:         v.stem,
    options:      v.options,
    answer_index: v.answerIndex,
    image_url:    null,
  }));

  const { data, error } = await sb.from("questions").insert(payload).select("id");
  if (error) { console.error("Insert failed:", error.message); process.exit(1); }

  (data ?? []).forEach((row, i) => {
    draftIds[toInsert[i].qNo] = { db_id: row.id, page: toInsert[i].page };
  });
  inserted = data?.length ?? 0;

  fs.writeFileSync(draftIdsPath, JSON.stringify(draftIds, null, 2) + "\n");
} else if (isDryRun) {
  inserted = toInsert.length;
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\nDiagram draft import${isDryRun ? " (dry run)" : ""} — ${csvFile}`);
console.log(`  Rows in file : ${rows.length}`);
console.log(`  Invalid      : ${invalid.length}`);
console.log(`  Duplicates   : ${dupes.length}`);
console.log(`  ${isDryRun ? "Would insert" : "Inserted"} : ${inserted}  (status=draft, image_url=null)`);

if (!isDryRun && inserted > 0) {
  console.log(`  Draft IDs    : ${draftIdsPath}`);
  for (const v of toInsert) {
    const id = draftIds[v.qNo]?.db_id ?? "(dry)";
    console.log(`    Q${String(v.qNo).padStart(3)} [${v.subject}] ${v.chapter.slice(0, 40)}  →  ${id}`);
  }
}

if (dupes.length) {
  console.log(`\nDuplicates skipped (already in global bank for this chapter):`);
  dupes.forEach((v) => console.log(`  Q${v.qNo} [${v.subject}] ${v.stem.slice(0, 60)}`));
}

if (isDryRun) {
  console.log(`\nDry run complete — no rows inserted. Remove --dry-run to import.`);
}

console.log(`\nNext: run promote-diagram-pyq.mjs with the draft-ids file and review folder.`);
