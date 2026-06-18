/**
 * STEP 2 of the chat-AI pipeline.
 *
 * Reads .translation-queue.json (written by pipeline-chat-fetch.ts and then
 * updated by the chat AI with Tamil translations), runs objective validation on
 * each translated item, stores results to the DB, and clears the queue file.
 *
 * Usage:
 *   npm run translate:store
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync, unlinkSync } from "fs";
import { resolve } from "path";

// Relative import — no @/ alias, no server-only chain
import {
  ENGLISH_RISK_WORDS,
  TAMIL_NEGATION_MARKERS,
  PRESERVED_UNITS,
  PRESERVED_CHEMICAL_FORMULAS,
  PRESERVED_MATH_PATTERNS,
} from "../lib/tamil/validation-config";

const QUEUE_FILE = resolve(process.cwd(), ".translation-queue.json");

// ─── Types ────────────────────────────────────────────────────────────────────

type GlossaryMatch = { id: string; english_term: string; tamil_term: string; subject: string | null };
type KnowledgeChunk = { id: string; source_type: string; subject: string; chapter: string | null; tamil_text: string; english_reference: string | null; similarity: number };

type Translation = {
  tamil_question_text: string;
  tamil_options: string[];
  tamil_explanation: string;
  model_observations: {
    glossary_match_rate: number;
    retrieval_matches: number;
    contains_negation: boolean;
    option_count_match: boolean;
    number_count_match: boolean;
    unit_preserved: boolean;
    chemical_formula_preserved: boolean;
    math_notation_preserved: boolean;
    context_relevance: "high" | "medium" | "low";
    glossary_coverage: string;
  };
  used_glossary_terms: { english: string; tamil: string }[];
  missing_expected_terms: string[];
};

type QueueItem = {
  questionId: string;
  question_text: string;
  options: string[];
  subject: string;
  chapter: string | null;
  glossaryMatches: GlossaryMatch[];
  retrievedChunks: KnowledgeChunk[];
  translation: Translation | null;
};

// ─── Validation (mirrors validate.ts — pure, uses config arrays) ──────────────

const WEIGHTS = {
  risk_words_preserved:        30,
  glossary_match_rate:         25,
  option_count_match:          20,
  number_count_match:          10,
  unit_preserved:              10,
  chemical_formula_preserved:   5,
  math_notation_preserved:      5,
};

function checkRiskWords(english: string, tamil: string): boolean {
  const all = [
    ...ENGLISH_RISK_WORDS.negation,
    ...ENGLISH_RISK_WORDS.extremity,
    ...ENGLISH_RISK_WORDS.correctness,
    ...ENGLISH_RISK_WORDS.absolutes,
  ];
  const hasRisk = all.some((w) => new RegExp(`\\b${w}\\b`).test(english.toUpperCase()));
  if (!hasRisk) return true;
  return TAMIL_NEGATION_MARKERS.some((m) => tamil.includes(m));
}

function countNumbers(text: string): number {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).length;
}

function checkUnits(english: string, tamil: string): boolean {
  const present = PRESERVED_UNITS.filter((u) => english.includes(u));
  const adjacent = english.match(/\d[\d.]*\s*([A-Za-z][A-Za-z/·⁻⁰¹²³⁴⁵⁶⁷⁸⁹]{0,9})/g) ?? [];
  const candidates = adjacent
    .map((m) => m.replace(/^[\d.\s]+/, "").trim())
    .filter((u) => u.length >= 1 && u.length <= 10 && /[A-Za-z]/.test(u));
  const unknown = candidates.filter((u) => !PRESERVED_UNITS.includes(u));
  if (unknown.length > 0)
    console.warn(`[Validator] Unknown units: ${unknown.join(", ")} — consider adding to PRESERVED_UNITS`);
  return present.every((u) => tamil.includes(u));
}

function checkFormulas(english: string, tamil: string): boolean {
  return PRESERVED_CHEMICAL_FORMULAS.filter((f) => english.includes(f)).every((f) => tamil.includes(f));
}

function checkMath(english: string, tamil: string): boolean {
  return PRESERVED_MATH_PATTERNS.filter((p) => p.test(english)).every((p) => p.test(tamil));
}

function calcGlossaryRate(translation: Translation, matches: GlossaryMatch[]): number {
  if (matches.length === 0) return 100;
  const full = translation.tamil_question_text + " " + translation.tamil_options.join(" ") + " " + translation.tamil_explanation;
  const found = matches.filter((m) => full.includes(m.tamil_term)).length;
  return Math.round((found / matches.length) * 100);
}

function validate(item: QueueItem) {
  const t = item.translation!;
  const eng = item.question_text;
  const tamQ = t.tamil_question_text;

  const glossaryRate = calcGlossaryRate(t, item.glossaryMatches);

  const checks = {
    risk_words_preserved:        checkRiskWords(eng, tamQ),
    option_count_match:          item.options.length === t.tamil_options.length,
    number_count_match:          countNumbers(eng) === countNumbers(tamQ),
    unit_preserved:              checkUnits(eng, tamQ),
    chemical_formula_preserved:  checkFormulas(eng, tamQ),
    math_notation_preserved:     checkMath(eng, tamQ),
    glossary_match_rate:         glossaryRate,
    retrieval_matches:           item.retrievedChunks.length,
    context_relevance:           (item.retrievedChunks.length === 0
                                   ? "low"
                                   : item.retrievedChunks.length >= 4
                                     ? "high"
                                     : "medium") as "high" | "medium" | "low",
  };

  let score = 0;
  score += checks.risk_words_preserved ? WEIGHTS.risk_words_preserved : 0;
  score += (checks.glossary_match_rate / 100) * WEIGHTS.glossary_match_rate;
  score += checks.option_count_match ? WEIGHTS.option_count_match : 0;
  score += checks.number_count_match ? WEIGHTS.number_count_match : 0;
  score += checks.unit_preserved ? WEIGHTS.unit_preserved : 0;
  score += checks.chemical_formula_preserved ? WEIGHTS.chemical_formula_preserved : 0;
  score += checks.math_notation_preserved ? WEIGHTS.math_notation_preserved : 0;

  const roundedScore = Math.min(100, Math.round(score));
  const auto_review_required = roundedScore < 80 || !checks.risk_words_preserved;

  const failed_checks = Object.entries(checks)
    .filter(([k, v]) =>
      typeof v === "boolean" &&
      !v &&
      !["retrieval_matches", "context_relevance", "glossary_match_rate"].includes(k),
    )
    .map(([k]) => k);

  return { checks, score: roundedScore, auto_review_required, failed_checks };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key);

  // Read queue
  let raw: string;
  try {
    raw = readFileSync(QUEUE_FILE, "utf8");
  } catch {
    throw new Error(".translation-queue.json not found. Run npm run translate:fetch first.");
  }

  const queue: { items: QueueItem[] } = JSON.parse(raw);
  const items = queue.items ?? [];

  const ready = items.filter((it) => it.translation !== null);
  const pending = items.filter((it) => it.translation === null);

  if (ready.length === 0) {
    console.log("\n⚠ No translated items in queue. Fill in the translation field(s) first.");
    console.log(`  ${pending.length} item(s) still have translation: null`);
    return;
  }

  console.log(`\n${"═".repeat(54)}`);
  console.log(`  PIPELINE STORE — ${ready.length} translation(s)`);
  console.log(`${"═".repeat(54)}`);

  let passed = 0;
  let flagged = 0;

  for (let i = 0; i < ready.length; i++) {
    const item = ready[i];
    const t = item.translation!;

    console.log(`\n── [${i + 1}/${ready.length}] ${item.questionId}`);
    console.log(`   ${item.question_text.slice(0, 80)}${item.question_text.length > 80 ? "…" : ""}`);

    const v = validate(item);
    const tamilStatus = v.auto_review_required ? "review_required" : "ai_drafted";

    const validationResult = {
      score:                v.score,
      auto_review_required: v.auto_review_required,
      failed_checks:        v.failed_checks,
      checks:               v.checks,
      retrieved_chunk_ids:  item.retrievedChunks.map((c) => c.id),
      glossary_match_ids:   item.glossaryMatches.map((m) => m.id),
      note:                 "Translation produced by chat AI (no Anthropic API credits used)",
    };

    const { error } = await supabase
      .from("questions")
      .update({
        tamil_question_text:     t.tamil_question_text,
        tamil_options:           t.tamil_options,
        tamil_explanation:       t.tamil_explanation,
        tamil_status:            tamilStatus,
        tamil_confidence_notes:  t.model_observations,
        tamil_validation_result: validationResult,
        tamil_error_log:         null,
        tamil_drafted_at:        new Date().toISOString(),
      })
      .eq("id", item.questionId);

    if (error) {
      console.log(`   ✗ DB error: ${error.message}`);
      continue;
    }

    console.log(`   Score  : ${v.score}/100  |  Status: ${tamilStatus}`);
    console.log(`   Checks : ${v.failed_checks.length === 0 ? "all passed ✓" : "FAILED: " + v.failed_checks.join(", ")}`);
    console.log(`   Tamil  : ${t.tamil_question_text.slice(0, 70)}…`);

    if (v.auto_review_required) flagged++;
    else passed++;
  }

  // Clear queue file
  try { unlinkSync(QUEUE_FILE); } catch { /* already gone */ }

  console.log(`\n${"═".repeat(54)}`);
  console.log(`  DONE`);
  console.log(`  ✓ ai_drafted     : ${passed}`);
  console.log(`  ⚠ review_required: ${flagged}`);
  if (pending.length > 0)
    console.log(`  ○ still pending  : ${pending.length} (not stored — no translation)`);
  console.log(`${"═".repeat(54)}\n`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
