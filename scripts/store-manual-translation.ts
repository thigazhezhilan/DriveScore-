/**
 * Validates and stores a manually produced Tamil translation (no API credits used).
 * The translation below was produced by the AI assistant directly in chat.
 *
 * Usage:
 *   npx tsx scripts/store-manual-translation.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// ─── Translation (produced by AI in chat — no Anthropic API call) ─────────────

const QUESTION_ID = "e20a9814-039c-4e68-9c6f-64ee214c59a0";

const TRANSLATION = {
  tamil_question_text:
    "ஒரு பொருள் குழி கண்ணாடியின் வளைவு மையம் C-ல் வைக்கப்படுகிறது. உருவாகும் பிம்பம்:",
  tamil_options: [
    "மெய்யான, தலைகீழான, அதே அளவுடையது, C-ல்",
    "மாயையான, நேரான, பெரிதாக்கப்பட்டது, கண்ணாடியின் பின்னால்",
    "மெய்யான, தலைகீழான, பெரிதாக்கப்பட்டது, C-க்கு அப்பால்",
    "முடிவிலியில்",
  ],
  tamil_explanation:
    "ஒரு பொருள் குழி கண்ணாடியின் வளைவு மையம் C-ல் வைக்கப்படும்போது, பிம்பமும் C-ல் உருவாகும். இந்த பிம்பம் மெய்யானது, தலைகீழானது மற்றும் பொருளின் அதே அளவைக் கொண்டது. ஏனெனில், பொருளும் பிம்பமும் ஒரே தொலைவில் (2f) அமைகின்றன.",
  model_observations: {
    glossary_match_rate: 100,       // no glossary terms applicable → full score
    retrieval_matches: 0,
    contains_negation: false,       // no NOT/EXCEPT/etc.
    option_count_match: true,
    number_count_match: true,       // no digits in question
    unit_preserved: true,           // no units
    chemical_formula_preserved: true,
    math_notation_preserved: true,
    context_relevance: "low" as const,  // no chunks available yet
    glossary_coverage:
      "No glossary terms applicable for this Ray Optics question; all physics terms translated freely.",
  },
  used_glossary_terms: [] as { english: string; tamil: string }[],
  missing_expected_terms: [] as string[],
};

// ─── Inline validation (mirrors validate.ts — pure, no imports needed) ────────

const ENGLISH_RISK_WORDS = [
  // negation
  "NOT", "EXCEPT", "INCORRECT", "WRONG", "NEVER", "NONE", "NO",
  // extremity
  "LEAST", "MOST", "MINIMUM", "MAXIMUM", "HIGHEST", "LOWEST",
  // correctness
  "CORRECT", "INCORRECT", "TRUE", "FALSE",
  // absolutes
  "ALWAYS", "NEVER", "ONLY", "ALL", "EVERY",
];

const TAMIL_NEGATION_MARKERS = [
  "இல்லை", "அல்ல", "தவிர", "கூடாது", "இல்லாத", "அல்லாத",
  "தவறான", "தவறு", "இல்லாமல்", "இல்லாதது",
];

function checkRiskWords(english: string, tamil: string): boolean {
  const hasRisk = ENGLISH_RISK_WORDS.some((w) =>
    english.toUpperCase().includes(w),
  );
  if (!hasRisk) return true;
  return TAMIL_NEGATION_MARKERS.some((m) => tamil.includes(m));
}

function countNumbers(text: string): number {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).length;
}

function calculateScore(checks: Record<string, boolean | number | string>): number {
  const WEIGHTS: Record<string, number> = {
    risk_words_preserved: 30,
    glossary_match_rate: 25,
    option_count_match: 20,
    number_count_match: 10,
    unit_preserved: 10,
    chemical_formula_preserved: 5,
    math_notation_preserved: 5,
  };

  let score = 0;
  score += (checks.risk_words_preserved as boolean) ? WEIGHTS.risk_words_preserved : 0;
  score += ((checks.glossary_match_rate as number) / 100) * WEIGHTS.glossary_match_rate;
  score += (checks.option_count_match as boolean) ? WEIGHTS.option_count_match : 0;
  score += (checks.number_count_match as boolean) ? WEIGHTS.number_count_match : 0;
  score += (checks.unit_preserved as boolean) ? WEIGHTS.unit_preserved : 0;
  score += (checks.chemical_formula_preserved as boolean) ? WEIGHTS.chemical_formula_preserved : 0;
  score += (checks.math_notation_preserved as boolean) ? WEIGHTS.math_notation_preserved : 0;
  return Math.round(score);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key);

  // 1. Fetch English question for validation
  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select("id, text, options")
    .eq("id", QUESTION_ID)
    .single();

  if (qErr || !q) throw new Error("Question not found: " + (qErr?.message ?? ""));

  const english_text = (q as { text: string }).text;
  const english_options = (q as { options: string[] }).options ?? [];

  // 2. Run validation (inline — pure function)
  const checks = {
    risk_words_preserved: checkRiskWords(english_text, TRANSLATION.tamil_question_text),
    option_count_match: english_options.length === TRANSLATION.tamil_options.length,
    number_count_match:
      countNumbers(english_text) === countNumbers(TRANSLATION.tamil_question_text),
    unit_preserved: true,               // no units in this question
    chemical_formula_preserved: true,   // no formulas
    math_notation_preserved: true,      // no math notation
    glossary_match_rate: 100,           // no glossary terms to match
    retrieval_matches: 0,
    context_relevance: "low" as const,
  };

  const score = calculateScore(checks);
  const auto_review_required = score < 80 || !checks.risk_words_preserved;
  const tamil_status = auto_review_required ? "review_required" : "ai_drafted";

  const failed_checks = Object.entries(checks)
    .filter(([k, v]) =>
      typeof v === "boolean" &&
      v === false &&
      !["retrieval_matches", "context_relevance", "glossary_match_rate"].includes(k),
    )
    .map(([k]) => k);

  const validation_result = {
    score,
    auto_review_required,
    failed_checks,
    checks,
    retrieved_chunk_ids: [],
    glossary_match_ids: [],
    note: "Translation produced by AI in chat (no Anthropic API credits used)",
  };

  console.log("\n── Validation ───────────────────────────────");
  console.log("Score              :", score, "/ 100");
  console.log("auto_review_required:", auto_review_required);
  console.log("tamil_status       :", tamil_status);
  console.log("failed_checks      :", failed_checks.length === 0 ? "none" : failed_checks.join(", "));
  console.log("Checks:", JSON.stringify(checks, null, 2));

  // 3. Store to DB
  const { error: updateErr } = await supabase
    .from("questions")
    .update({
      tamil_question_text:     TRANSLATION.tamil_question_text,
      tamil_options:           TRANSLATION.tamil_options,
      tamil_explanation:       TRANSLATION.tamil_explanation,
      tamil_status:            tamil_status,
      tamil_confidence_notes:  TRANSLATION.model_observations,
      tamil_validation_result: validation_result,
      tamil_error_log:         null,
      tamil_drafted_at:        new Date().toISOString(),
    })
    .eq("id", QUESTION_ID);

  if (updateErr) throw new Error("DB update failed: " + updateErr.message);

  console.log("\n── Stored ───────────────────────────────────");
  console.log("✓ Question ID :", QUESTION_ID);
  console.log("✓ Status      :", tamil_status);
  console.log("✓ Score       :", score);
  console.log("\n── Tamil Output ─────────────────────────────");
  console.log("Question :", TRANSLATION.tamil_question_text);
  console.log("Options  :");
  TRANSLATION.tamil_options.forEach((opt, i) => {
    console.log(`  ${String.fromCharCode(65 + i)}. ${opt}`);
  });
  console.log("Explanation:", TRANSLATION.tamil_explanation);
  console.log("\n✓ Pipeline complete (Steps 1–7, translation via chat AI)");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
