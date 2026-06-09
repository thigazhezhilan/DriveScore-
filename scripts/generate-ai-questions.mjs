/**
 * AI question generator for the "AI Practice" track (auto-verified, no human gate).
 *
 * For a subject + chapter + difficulty, it:
 *   1. anchors on 3–4 REAL past-paper questions from that chapter (few-shot),
 *   2. generates N fresh MCQs with Claude,
 *   3. AUTO-VERIFIES each: a SECOND independent call re-solves the question cold
 *      (without seeing the claimed answer) and must agree, plus structural +
 *      dedupe checks — anything failing is discarded, not published,
 *   4. inserts the survivors into the bank as source='ai'.
 *
 * Runtime cost only at generation; students get them free + fast. Questions are
 * clearly labelled "AI" in the app and carry a "Report" button as a safety net.
 *
 * Usage:
 *   node scripts/generate-ai-questions.mjs <Subject> "<Chapter>" <Easy|Medium|Hard> <count>
 * Requires .env.local: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import { CHAPTERS } from "./ncert-classify.mjs";

const [subjectArg, chapterArg, diffArg, countArg] = process.argv.slice(2);
if (!subjectArg || !chapterArg || !diffArg) {
  console.error('usage: node scripts/generate-ai-questions.mjs <Subject> "<Chapter>" <Easy|Medium|Hard> [count]');
  process.exit(1);
}
const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const DIFFS = ["Easy", "Medium", "Hard"];
const PAR = { Easy: 45, Medium: 60, Hard: 90 };
const LETTER = { A: 0, B: 1, C: 2, D: 3 };

const subject = SUBJECTS.find((s) => s.toLowerCase() === subjectArg.toLowerCase());
const difficulty = DIFFS.find((d) => d.toLowerCase() === diffArg.toLowerCase());
const count = Math.max(1, Math.min(30, Number(countArg) || 5));
if (!subject) { console.error("Subject must be Physics|Chemistry|Biology"); process.exit(1); }
if (!difficulty) { console.error("Difficulty must be Easy|Medium|Hard"); process.exit(1); }
const chapter = (CHAPTERS[subject] || []).find((c) => c.toLowerCase() === chapterArg.toLowerCase());
if (!chapter) {
  console.error(`"${chapterArg}" is not an NCERT ${subject} chapter. See lib/questions/chapters.ts.`);
  process.exit(1);
}

// ── env + clients ──
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const API_KEY = env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("Missing ANTHROPIC_API_KEY in .env.local"); process.exit(1); }
const MODEL = env.CLAUDE_MODEL || "claude-sonnet-4-6";
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** One Anthropic Messages call → assistant text. */
async function claude(system, user, maxTokens = 4000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("");
}

function parseJson(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text;
  const start = raw.search(/[[{]/);
  return JSON.parse(start >= 0 ? raw.slice(start) : raw);
}

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 45);

// ── 1. few-shot anchors from real PYQs in this chapter ──
const { data: anchors } = await sb.from("questions")
  .select("text, options, answer_index")
  .is("centre_id", null).eq("source", "pyq").eq("subject", subject).eq("chapter", chapter)
  .not("text", "eq", "").limit(4);
const examples = (anchors || []).filter((a) => a.text).map((a) => ({
  question: a.text,
  options: a.options,
  answer: "ABCD"[a.answer_index] || "A",
}));

// dedupe set
const { data: existing } = await sb.from("questions")
  .select("text").is("centre_id", null).eq("subject", subject).eq("chapter", chapter);
const seenText = new Set((existing || []).map((e) => norm(e.text)));

// ── 2. generate ──
const genSystem =
  "You are an expert NEET (India) question setter. You write original, single-correct-answer MCQs strictly within the NCERT syllabus. " +
  "Every question must be unambiguous, factually correct, and self-contained in plain text (no figures, no 'All of the above'). Return ONLY JSON.";
const genUser =
  `Generate ${count} ${difficulty}-difficulty NEET MCQs for the NCERT ${subject} chapter "${chapter}".\n` +
  (examples.length ? `Match the style/level of these real past-paper examples:\n${JSON.stringify(examples, null, 2)}\n` : "") +
  `Return a JSON array; each item: {"question": str, "options": [4 strings], "answer": "A"|"B"|"C"|"D", "concept": str, "explanation": str}. ` +
  `Make the 4 options plausible and distinct, exactly one correct. JSON only.`;

console.log(`Generating ${count} ${difficulty} ${subject} / ${chapter} (model ${MODEL})…`);
let generated;
try { generated = parseJson(await claude(genSystem, genUser, 6000)); }
catch (e) { console.error("Generation/parse failed:", e.message); process.exit(1); }
if (!Array.isArray(generated)) { console.error("Model did not return an array."); process.exit(1); }

// ── 3. verify each (independent re-solve + structural + dedupe) ──
const published = [];
const discarded = [];
for (const g of generated) {
  const opts = Array.isArray(g.options) ? g.options.map((o) => String(o).trim()) : [];
  const ansIdx = LETTER[String(g.answer || "").toUpperCase()];
  const reason = (r) => discarded.push(`"${String(g.question || "").slice(0, 45)}…" — ${r}`);

  if (!g.question || opts.length !== 4 || opts.some((o) => !o)) { reason("bad structure"); continue; }
  if (new Set(opts.map((o) => o.toLowerCase())).size !== 4) { reason("duplicate options"); continue; }
  if (opts.some((o) => /all of the above|none of the above/i.test(o))) { reason("ambiguous option"); continue; }
  if (ansIdx === undefined) { reason("bad answer letter"); continue; }
  if (seenText.has(norm(g.question))) { reason("duplicate of existing"); continue; }

  // independent solve — model never sees the claimed answer
  let solved;
  try {
    const vText = await claude(
      "You are a NEET expert. Solve the MCQ. Reply ONLY JSON: {\"answer\":\"A|B|C|D\",\"confident\":true|false}.",
      `${g.question}\nA) ${opts[0]}\nB) ${opts[1]}\nC) ${opts[2]}\nD) ${opts[3]}`,
      300,
    );
    solved = parseJson(vText);
  } catch { reason("verify call failed"); continue; }
  const solvedIdx = LETTER[String(solved.answer || "").toUpperCase()];
  if (solvedIdx !== ansIdx) { reason(`independent solve disagreed (got ${solved.answer})`); continue; }
  if (solved.confident === false) { reason("verifier not confident"); continue; }

  seenText.add(norm(g.question));
  published.push({
    centre_id: null, source: "ai", hidden: false,
    subject, chapter, concept: String(g.concept || chapter).slice(0, 120),
    difficulty, par_time_sec: PAR[difficulty],
    text: g.question, options: opts, answer_index: ansIdx,
  });
}

// ── 4. insert survivors ──
let inserted = 0;
if (published.length) {
  const { data, error } = await sb.from("questions").insert(published).select("id");
  if (error) { console.error("Insert failed:", error.message); process.exit(1); }
  inserted = data?.length ?? 0;
}

console.log(`\nGenerated ${generated.length} · published ${inserted} · discarded ${discarded.length}`);
if (discarded.length) { console.log("Discarded:"); discarded.forEach((d) => console.log("  - " + d)); }
console.log(`\nThese are live in AI Practice → ${subject} → ${chapter}. Spot-check the first batch.`);
