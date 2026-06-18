// Pure validation functions — no DB, no API, fully unit-testable.
// All term lists come from validation-config.ts — never hardcoded here.

import {
  ENGLISH_RISK_WORDS,
  TAMIL_NEGATION_MARKERS,
  PRESERVED_UNITS,
  PRESERVED_CHEMICAL_FORMULAS,
  PRESERVED_MATH_PATTERNS,
} from "./validation-config";
import type { GlossaryMatch } from "./glossary";
import type { KnowledgeChunk } from "./retrieval";
import type { TranslationOutput } from "./translate";

export type ValidationChecks = {
  risk_words_preserved: boolean;
  option_count_match: boolean;
  number_count_match: boolean;
  unit_preserved: boolean;
  chemical_formula_preserved: boolean;
  math_notation_preserved: boolean;
  glossary_match_rate: number;    // 0–100
  retrieval_matches: number;
  context_relevance: "high" | "medium" | "low";
};

export type ValidationResult = {
  checks: ValidationChecks;
  score: number;                  // 0–100 weighted
  auto_review_required: boolean;
  failed_checks: string[];
};

const WEIGHTS = {
  risk_words_preserved:       30,
  glossary_match_rate:        25,  // applied as (rate/100) * weight
  option_count_match:         20,
  number_count_match:         10,
  unit_preserved:             10,
  chemical_formula_preserved:  5,
  math_notation_preserved:     5,
};

export function validateTranslation(
  englishQuestion: { question_text: string; options: string[] },
  tamilDraft: TranslationOutput,
  glossaryMatches: GlossaryMatch[],
  retrievedChunks: KnowledgeChunk[],
): ValidationResult {
  const checks: ValidationChecks = {
    risk_words_preserved:       checkRiskWords(englishQuestion.question_text, tamilDraft.tamil_question_text),
    option_count_match:         englishQuestion.options.length === tamilDraft.tamil_options.length,
    number_count_match:         countNumbers(englishQuestion.question_text) === countNumbers(tamilDraft.tamil_question_text),
    unit_preserved:             checkUnits(englishQuestion.question_text, tamilDraft.tamil_question_text),
    chemical_formula_preserved: checkChemicalFormulas(englishQuestion.question_text, tamilDraft.tamil_question_text),
    math_notation_preserved:    checkMathNotation(englishQuestion.question_text, tamilDraft.tamil_question_text),
    glossary_match_rate:        calculateGlossaryRate(tamilDraft, glossaryMatches),
    retrieval_matches:          retrievedChunks.length,
    context_relevance:          retrievedChunks.length === 0 ? "low"
                                : retrievedChunks.length >= 4 ? "high"
                                : "medium",
  };

  let score = 0;
  score += checks.risk_words_preserved ? WEIGHTS.risk_words_preserved : 0;
  score += (checks.glossary_match_rate / 100) * WEIGHTS.glossary_match_rate;
  score += checks.option_count_match ? WEIGHTS.option_count_match : 0;
  score += checks.number_count_match ? WEIGHTS.number_count_match : 0;
  score += checks.unit_preserved ? WEIGHTS.unit_preserved : 0;
  score += checks.chemical_formula_preserved ? WEIGHTS.chemical_formula_preserved : 0;
  score += checks.math_notation_preserved ? WEIGHTS.math_notation_preserved : 0;

  const roundedScore = Math.round(score);
  const auto_review_required = roundedScore < 80 || !checks.risk_words_preserved;

  const failed_checks = (
    Object.entries(checks) as [string, boolean | number | string][]
  )
    .filter(([k, v]) =>
      typeof v === "boolean" && v === false &&
      !["retrieval_matches", "context_relevance", "glossary_match_rate"].includes(k)
    )
    .map(([k]) => k);

  return { checks, score: roundedScore, auto_review_required, failed_checks };
}

// ─── Helper functions (all use config arrays) ─────────────────────────────────

export function checkRiskWords(english: string, tamil: string): boolean {
  const allRiskWords = [
    ...ENGLISH_RISK_WORDS.negation,
    ...ENGLISH_RISK_WORDS.extremity,
    ...ENGLISH_RISK_WORDS.correctness,
    ...ENGLISH_RISK_WORDS.absolutes,
  ];

  const hasRiskWord = allRiskWords.some((w) => english.toUpperCase().includes(w));
  if (!hasRiskWord) return true;  // no risk word to preserve — automatic pass

  const hasTamilMarker = TAMIL_NEGATION_MARKERS.some((m) => tamil.includes(m));
  return hasTamilMarker;
}

export function countNumbers(text: string): number {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).length;
}

export function checkUnits(english: string, tamil: string): boolean {
  const presentUnits = PRESERVED_UNITS.filter((u) => english.includes(u));

  // Only flag candidate units that appear adjacent to numbers — avoids
  // false-positives on ordinary English words like "is", "the", "of".
  // Pattern: digit(s), optional space, then letters/slashes/superscripts.
  const adjacentToNumbers = english.match(/\d[\d.]*\s*([A-Za-z][A-Za-z/·⁻⁰¹²³⁴⁵⁶⁷⁸⁹]{0,9})/g) ?? [];
  const candidates = adjacentToNumbers
    .map((m) => m.replace(/^[\d.\s]+/, "").trim())
    .filter((u) => u.length >= 1 && u.length <= 10 && /[A-Za-z]/.test(u));

  const unknownUnits = candidates.filter((u) => !PRESERVED_UNITS.includes(u));
  if (unknownUnits.length > 0) {
    console.warn(
      `[Tamil Validator] Unknown units encountered: ${unknownUnits.join(", ")} — consider adding to PRESERVED_UNITS in validation-config.ts`,
    );
  }

  return presentUnits.every((u) => tamil.includes(u));
}

export function checkChemicalFormulas(english: string, tamil: string): boolean {
  const presentFormulas = PRESERVED_CHEMICAL_FORMULAS.filter((f) => english.includes(f));
  return presentFormulas.every((f) => tamil.includes(f));
}

export function checkMathNotation(english: string, tamil: string): boolean {
  const presentPatterns = PRESERVED_MATH_PATTERNS.filter((p) => p.test(english));
  return presentPatterns.every((p) => p.test(tamil));
}

export function calculateGlossaryRate(
  tamilDraft: TranslationOutput,
  glossaryMatches: GlossaryMatch[],
): number {
  if (glossaryMatches.length === 0) return 100;  // no terms to check — full score

  const allTamilText =
    tamilDraft.tamil_question_text + " " +
    tamilDraft.tamil_options.join(" ") + " " +
    tamilDraft.tamil_explanation;

  const found = glossaryMatches.filter((m) => allTamilText.includes(m.tamil_term)).length;
  return Math.round((found / glossaryMatches.length) * 100);
}
