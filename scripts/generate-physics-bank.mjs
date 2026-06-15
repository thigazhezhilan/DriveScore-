/**
 * Physics AI-bank orchestrator — tops up EVERY NCERT Physics chapter to a target
 * count of verified AI-practice questions, per difficulty.
 *
 * It reuses the exact, proven generate → INDEPENDENT-RE-SOLVE verify → dedupe →
 * insert core from `generate-ai-questions.mjs`, but loops per chapter/difficulty
 * until each tier hits its target, counting questions already in the bank first
 * (so re-runs resume / top-up rather than duplicate).
 *
 * Target per chapter (configurable below): 100 = 40 Easy / 35 Medium / 25 Hard.
 *
 * Every published question has been verified by a SECOND, independent Claude call
 * that re-solved it cold (without seeing the claimed answer) and agreed — plus
 * structural + cross-bank dedupe checks. Failures are discarded, never inserted.
 *
 * Writes to the bank as centre_id=null, source='ai' (the global AI-Practice pool,
 * live to all students). Idempotent: safe to stop and re-run.
 *
 * Usage:
 *   node scripts/generate-physics-bank.mjs                 # all 28 chapters → 100 each
 *   node scripts/generate-physics-bank.mjs --smoke         # 1 chapter, 2 per tier (mechanics test)
 *   node scripts/generate-physics-bank.mjs --chapter "Ray Optics and Optical Instruments"
 *   node scripts/generate-physics-bank.mjs --target 60     # override per-chapter total (scaled mix)
 *
 * Requires .env.local: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import { CHAPTERS } from "./ncert-classify.mjs";

// ── config ──
const SUBJECT = "Physics";
const MIX = { Easy: 40, Medium: 35, Hard: 25 }; // sums to 100
const PAR = { Easy: 45, Medium: 60, Hard: 90 };
const LETTER = { A: 0, B: 1, C: 2, D: 3 };
const GEN_BATCH = 12;        // questions requested per generation call
const VERIFY_CONCURRENCY = 5; // parallel independent-solve calls
const MAX_ROUNDS_PER_TIER = 18; // safety cap so a stubborn tier can't loop forever

// ── args ──
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const SMOKE = has("--smoke");
const ONE_CHAPTER = valOf("--chapter");
const TARGET_TOTAL = SMOKE ? 6 : Number(valOf("--target")) || 100;

// Scale the 40/35/25 mix to the requested total (keeps proportions).
const scaledMix = () => {
  if (TARGET_TOTAL === 100) return { ...MIX };
  if (SMOKE) return { Easy: 2, Medium: 2, Hard: 2 };
  const e = Math.round(TARGET_TOTAL * 0.40);
  const m = Math.round(TARGET_TOTAL * 0.35);
  return { Easy: e, Medium: m, Hard: TARGET_TOTAL - e - m };
};
const TIER_TARGET = scaledMix();

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

// ── helpers ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One Anthropic Messages call → assistant text, with backoff on 429/529. */
async function claude(system, user, maxTokens = 4000, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      });
    } catch (e) {
      if (attempt === tries) throw e;
      await sleep(1500 * attempt); continue;
    }
    if (res.ok) { const d = await res.json(); return (d.content || []).map((b) => b.text || "").join(""); }
    const body = (await res.text());
    // Hard, non-transient errors (no credit, bad key, bad request) — fail fast.
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const err = new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
      if (/credit balance is too low/i.test(body)) err.fatalBilling = true;
      throw err;
    }
    if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < tries) {
      await sleep(2000 * attempt); continue;
    }
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 160)}`);
  }
  throw new Error("Anthropic: exhausted retries");
}

function parseJson(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text;
  const start = raw.search(/[[{]/);
  return JSON.parse(start >= 0 ? raw.slice(start) : raw);
}

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 45);

/** Count existing non-hidden AI questions for a chapter+difficulty. */
async function existingCount(chapter, difficulty) {
  const { count } = await sb.from("questions").select("*", { count: "exact", head: true })
    .is("centre_id", null).eq("source", "ai").eq("hidden", false)
    .eq("subject", SUBJECT).eq("chapter", chapter).eq("difficulty", difficulty);
  return count ?? 0;
}

/** Few-shot anchors: real PYQs in this chapter (style reference). Fetched once per chapter. */
async function anchorsFor(chapter) {
  const { data } = await sb.from("questions").select("text, options, answer_index")
    .is("centre_id", null).eq("source", "pyq").eq("subject", SUBJECT).eq("chapter", chapter)
    .not("text", "eq", "").limit(4);
  return (data || []).filter((a) => a.text).map((a) => ({
    question: a.text, options: a.options, answer: "ABCD"[a.answer_index] || "A",
  }));
}

/** All existing question texts for this chapter (any source) → dedupe set. */
async function seenTextsFor(chapter) {
  const { data } = await sb.from("questions").select("text")
    .is("centre_id", null).eq("subject", SUBJECT).eq("chapter", chapter);
  return new Set((data || []).map((e) => norm(e.text)));
}

/** Generate one batch of candidate MCQs for a chapter+difficulty. */
async function generateBatch(chapter, difficulty, n, examples) {
  const genSystem =
    "You are an expert NEET (India) question setter. You write original, single-correct-answer MCQs strictly within the NCERT syllabus. " +
    "Every question must be unambiguous, factually correct, and self-contained in plain text (no figures, no 'All of the above'). Return ONLY JSON.";
  const genUser =
    `Generate ${n} ${difficulty}-difficulty NEET MCQs for the NCERT ${SUBJECT} chapter "${chapter}".\n` +
    (examples.length ? `Match the style/level of these real past-paper examples:\n${JSON.stringify(examples, null, 2)}\n` : "") +
    `Return a JSON array; each item: {"question": str, "options": [4 strings], "answer": "A"|"B"|"C"|"D", "concept": str, "explanation": str}. ` +
    `Make the 4 options plausible and distinct, exactly one correct. JSON only.`;
  const out = await claude(genSystem, genUser, 8000);
  const parsed = parseJson(out);
  return Array.isArray(parsed) ? parsed : [];
}

/** Independent cold re-solve of one candidate. Returns {ok, reason, row?}. */
async function verifyOne(g, difficulty, chapter, seenText) {
  const opts = Array.isArray(g.options) ? g.options.map((o) => String(o).trim()) : [];
  const ansIdx = LETTER[String(g.answer || "").toUpperCase()];
  if (!g.question || opts.length !== 4 || opts.some((o) => !o)) return { ok: false, reason: "bad structure" };
  if (new Set(opts.map((o) => o.toLowerCase())).size !== 4) return { ok: false, reason: "duplicate options" };
  if (opts.some((o) => /all of the above|none of the above/i.test(o))) return { ok: false, reason: "ambiguous option" };
  if (ansIdx === undefined) return { ok: false, reason: "bad answer letter" };
  if (seenText.has(norm(g.question))) return { ok: false, reason: "duplicate of existing" };

  let solved;
  try {
    const vText = await claude(
      "You are a NEET expert. Solve the MCQ. Reply ONLY JSON: {\"answer\":\"A|B|C|D\",\"confident\":true|false}.",
      `${g.question}\nA) ${opts[0]}\nB) ${opts[1]}\nC) ${opts[2]}\nD) ${opts[3]}`,
      300,
    );
    solved = parseJson(vText);
  } catch { return { ok: false, reason: "verify call failed" }; }
  const solvedIdx = LETTER[String(solved.answer || "").toUpperCase()];
  if (solvedIdx !== ansIdx) return { ok: false, reason: `independent solve disagreed (got ${solved.answer})` };
  if (solved.confident === false) return { ok: false, reason: "verifier not confident" };

  return {
    ok: true,
    row: {
      centre_id: null, source: "ai", hidden: false,
      subject: SUBJECT, chapter, concept: String(g.concept || chapter).slice(0, 120),
      difficulty, par_time_sec: PAR[difficulty],
      text: g.question, options: opts, answer_index: ansIdx,
    },
  };
}

/** Verify an array of candidates with bounded concurrency. */
async function verifyBatch(cands, difficulty, chapter, seenText) {
  const survivors = []; const discards = [];
  for (let i = 0; i < cands.length; i += VERIFY_CONCURRENCY) {
    const slice = cands.slice(i, i + VERIFY_CONCURRENCY);
    const results = await Promise.all(slice.map((g) => verifyOne(g, difficulty, chapter, seenText)));
    results.forEach((r, k) => {
      if (r.ok && !seenText.has(norm(r.row.text))) { seenText.add(norm(r.row.text)); survivors.push(r.row); }
      else if (!r.ok) discards.push(`${String(slice[k].question || "").slice(0, 40)}… — ${r.reason}`);
    });
  }
  return { survivors, discards };
}

// ── main ──
let chapters = ONE_CHAPTER
  ? CHAPTERS[SUBJECT].filter((c) => c.toLowerCase() === ONE_CHAPTER.toLowerCase())
  : [...CHAPTERS[SUBJECT]];
if (SMOKE) chapters = chapters.slice(0, 1);
if (chapters.length === 0) { console.error(`No matching ${SUBJECT} chapter.`); process.exit(1); }

const report = [];
const startedAt = Date.now();
console.log(`Physics AI-bank · ${chapters.length} chapter(s) · target/chapter ${TARGET_TOTAL} (${TIER_TARGET.Easy}E/${TIER_TARGET.Medium}M/${TIER_TARGET.Hard}H) · model ${MODEL}`);
console.log("─".repeat(72));

let grandPublished = 0, grandDiscarded = 0;

for (const [ci, chapter] of chapters.entries()) {
  const examples = await anchorsFor(chapter);
  const seenText = await seenTextsFor(chapter);
  const line = { chapter, tiers: {} };
  let chapterPublished = 0;

  for (const difficulty of ["Easy", "Medium", "Hard"]) {
    const target = TIER_TARGET[difficulty];
    let have = await existingCount(chapter, difficulty);
    let need = target - have;
    let published = 0, discarded = 0, rounds = 0;

    while (need > 0 && rounds < MAX_ROUNDS_PER_TIER) {
      rounds++;
      const ask = Math.min(GEN_BATCH, need + 3); // small buffer for expected discards
      let cands;
      try { cands = await generateBatch(chapter, difficulty, ask, examples); }
      catch (e) {
        if (e.fatalBilling) {
          console.error(`\n✋ STOPPED: Anthropic API has no credit balance.\n   Add credit at https://console.anthropic.com → Plans & Billing, then re-run:\n   node scripts/generate-physics-bank.mjs\n   (Already-inserted questions are kept; the run resumes/tops-up.)`);
          process.exit(2);
        }
        console.log(`    ! gen failed (${difficulty}, round ${rounds}): ${e.message}`); await sleep(2000); continue;
      }
      if (cands.length === 0) { await sleep(1000); continue; }

      const { survivors, discards } = await verifyBatch(cands, difficulty, chapter, seenText);
      discarded += discards.length;
      const take = survivors.slice(0, need);
      if (take.length) {
        const { data, error } = await sb.from("questions").insert(take).select("id");
        if (error) { console.log(`    ! insert failed: ${error.message}`); await sleep(1500); continue; }
        const ins = data?.length ?? 0;
        published += ins; chapterPublished += ins; grandPublished += ins; need -= ins;
      }
    }
    grandDiscarded += discarded;
    line.tiers[difficulty] = { target, already: have, published, discarded, final: have + published, short: Math.max(0, need) };
    console.log(`  ${chapter} · ${difficulty}: +${published} (had ${have} → ${have + published}/${target})${need > 0 ? `  ⚠ short ${need}` : ""}  [discarded ${discarded}]`);
  }

  line.total = chapterPublished;
  report.push(line);
  console.log(`  ✓ ${chapter}: +${chapterPublished} this run  (${ci + 1}/${chapters.length} chapters)`);
  console.log("─".repeat(72));
}

const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
console.log(`\nDONE · published ${grandPublished} · discarded ${grandDiscarded} · ${mins} min`);

// ── write report ──
const md = [
  `# Physics AI-bank generation report`,
  ``,
  `- Date: ${new Date().toISOString()}`,
  `- Model: ${MODEL}`,
  `- Chapters: ${chapters.length} · target/chapter: ${TARGET_TOTAL} (${TIER_TARGET.Easy}E/${TIER_TARGET.Medium}M/${TIER_TARGET.Hard}H)`,
  `- This run: published **${grandPublished}**, discarded ${grandDiscarded}, ${mins} min`,
  ``,
  `| Chapter | Easy | Medium | Hard | Total |`,
  `|---|---|---|---|---|`,
  ...report.map((r) => {
    const cell = (d) => r.tiers[d] ? `${r.tiers[d].final}/${r.tiers[d].target}${r.tiers[d].short ? ` ⚠` : ""}` : "—";
    const tot = ["Easy", "Medium", "Hard"].reduce((s, d) => s + (r.tiers[d]?.final ?? 0), 0);
    return `| ${r.chapter} | ${cell("Easy")} | ${cell("Medium")} | ${cell("Hard")} | ${tot}/${TARGET_TOTAL} |`;
  }),
].join("\n");
fs.writeFileSync("AI-BANK-REPORT-physics.md", md + "\n");
console.log("Report → AI-BANK-REPORT-physics.md");
