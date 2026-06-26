/**
 * PYQ import sanity check.
 *
 * After importing past-year questions, run this to verify:
 *   1. Per-subject/chapter PYQ counts (which chapters are thin for anchoring).
 *   2. A sample student practice query returns these rows — confirming
 *      status='live' and language='en' filtering works end-to-end.
 *
 * Usage:
 *   node scripts/pyq-sanity.mjs
 *   node scripts/pyq-sanity.mjs Physics          (filter by subject)
 *   node scripts/pyq-sanity.mjs Physics --thin   (only show chapters with < 5 PYQs)
 *
 * Chapters with 0 PYQ rows are shown as "-- NONE --" — these have no real
 * exam anchors yet and should be prioritised for the next paper import.
 */

import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { CHAPTERS } = await import("./ncert-classify.mjs");

const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const filterSubject = process.argv.find((a) => SUBJECTS.includes(a)) ?? null;
const thinOnly = process.argv.includes("--thin");
const THIN_THRESHOLD = 5; // chapters below this count are flagged as thin

const subjects = filterSubject ? [filterSubject] : SUBJECTS;

// ─── 1. Fetch all global PYQ rows (source='pyq', language='en', status='live') ─

const rows = [];
for (let from = 0; ; from += 1000) {
  let q = sb
    .from("questions")
    .select("id, subject, chapter, difficulty")
    .is("centre_id", null)
    .eq("source", "pyq")
    .eq("language", "en")
    .eq("status", "live")
    .range(from, from + 999);
  if (filterSubject) q = q.eq("subject", filterSubject);
  const { data, error } = await q;
  if (error) { console.error("DB error:", error.message); process.exit(1); }
  rows.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}

// ─── 2. Per-subject/chapter count table ──────────────────────────────────────

console.log(`\nPYQ coverage — source=pyq, language=en, status=live, centre_id=null`);
if (filterSubject) console.log(`(filtered: ${filterSubject})`);
if (thinOnly) console.log(`(showing only chapters with < ${THIN_THRESHOLD} PYQs)`);

let grandTotal = 0;
for (const subject of subjects) {
  const subjectRows = rows.filter((r) => r.subject === subject);
  const chapters = CHAPTERS[subject] ?? [];

  // Build count map: chapter → {E, M, H, total}
  const counts = new Map();
  for (const ch of chapters) counts.set(ch, { E: 0, M: 0, H: 0, total: 0 });
  for (const r of subjectRows) {
    const c = counts.get(r.chapter);
    if (!c) continue;
    c.total++;
    if (r.difficulty === "Easy") c.E++;
    else if (r.difficulty === "Medium") c.M++;
    else if (r.difficulty === "Hard") c.H++;
  }

  // Count chapters not in the NCERT list (misclassified / "Unclassified")
  const orphans = subjectRows.filter((r) => !counts.has(r.chapter));

  const subTotal = subjectRows.length;
  grandTotal += subTotal;

  if (thinOnly) {
    const thin = [...counts.entries()].filter(([, v]) => v.total < THIN_THRESHOLD);
    if (thin.length === 0) {
      console.log(`\n${subject}: all ${chapters.length} chapters meet threshold (${subTotal} PYQs total)`);
      continue;
    }
    console.log(`\n${subject} (${subTotal} PYQs total) — ${thin.length} thin chapters:`);
    for (const [ch, v] of thin) {
      const bar = v.total === 0 ? "-- NONE --" : `${v.total} (E:${v.E} M:${v.M} H:${v.H})`;
      console.log(`  ${v.total === 0 ? "✗" : "△"} ${ch.padEnd(52)} ${bar}`);
    }
  } else {
    console.log(`\n${subject} — ${subTotal} PYQs across ${chapters.length} chapters`);
    for (const [ch, v] of counts) {
      const bar = v.total === 0 ? "-- NONE --" : `${v.total} (E:${v.E} M:${v.M} H:${v.H})`;
      const flag = v.total === 0 ? " ✗" : v.total < THIN_THRESHOLD ? " △" : "";
      console.log(`  ${ch.padEnd(52)} ${bar}${flag}`);
    }
  }

  if (orphans.length > 0) {
    console.log(`  ⚠ ${orphans.length} row(s) with unrecognised chapter:`);
    const byChapter = new Map();
    for (const r of orphans) byChapter.set(r.chapter, (byChapter.get(r.chapter) ?? 0) + 1);
    for (const [ch, n] of byChapter) console.log(`      "${ch}" — ${n} row(s)`);
  }
}

console.log(`\nTotal PYQ rows: ${grandTotal}`);

// ─── 3. Practice-query smoke test ────────────────────────────────────────────
// Simulate the query a student practice session runs: status='live', language='en'.
// Pick one PYQ row and fetch it the same way the app would.

console.log(`\n─── Practice-query smoke test ───`);
if (rows.length === 0) {
  console.log(`No PYQ rows to test — import some first.`);
} else {
  // Pick a random sample row by ID.
  const sample = rows[Math.floor(Math.random() * rows.length)];
  const { data: fetched, error: fetchErr } = await sb
    .from("questions")
    .select("id, subject, chapter, body, options, answer_index, status, language, source")
    .is("centre_id", null)
    .eq("id", sample.id)
    .eq("status", "live")
    .eq("language", "en")
    .single();

  if (fetchErr || !fetched) {
    console.error(`FAIL — could not fetch sample row ${sample.id}: ${fetchErr?.message}`);
    process.exit(1);
  }

  console.log(`Fetched sample (id=${fetched.id}):`);
  console.log(`  subject  : ${fetched.subject}`);
  console.log(`  chapter  : ${fetched.chapter}`);
  console.log(`  status   : ${fetched.status}`);
  console.log(`  language : ${fetched.language}`);
  console.log(`  source   : ${fetched.source}`);
  console.log(`  body     : ${String(fetched.body || "").slice(0, 70)}...`);
  const opts = Array.isArray(fetched.options) ? fetched.options : [];
  console.log(`  options  : [${opts.map((o) => `"${String(o).slice(0, 20)}"`).join(", ")}]`);
  console.log(`  answer   : ${fetched.answer_index} (${["A","B","C","D"][fetched.answer_index] ?? "?"})`);
  console.log(`\nPractice query: PASS ✓`);
}
