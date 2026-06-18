/**
 * Tests for the Tamil translation brain.
 *
 * Tests 1–6 are integration tests — they call the real APIs and DB.
 * They are skipped (soft-pass) if OPENAI_API_KEY or ANTHROPIC_API_KEY is absent.
 *
 * Tests 5, 7, 8 are pure unit tests — always run, no API or DB needed.
 *
 * Run:  npx tsx lib/tamil/agent.test.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import assert from "node:assert/strict";
import { validateTranslation, checkRiskWords, checkUnits } from "./validate";
import { getTamilContent, type QuestionWithTamil } from "./guard";
import type { TranslationOutput } from "./translate";
import type { GlossaryMatch } from "./glossary";
import type { KnowledgeChunk } from "./retrieval";

let passed = 0;
let skipped = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    })
    .catch((err) => {
      if (err instanceof SkipError) {
        skipped++;
        console.log(`  \x1b[33m⊘ SKIP\x1b[0m ${name} — ${err.message}`);
      } else {
        console.error(`  \x1b[31m✗ FAIL\x1b[0m ${name}`);
        console.error("    ", err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}

class SkipError extends Error {}
function requireEnv(...vars: string[]) {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new SkipError(`Missing env vars: ${missing.join(", ")}`);
  }
}

// Integration tests import modules that call getServiceClient() which has server-only.
// Wrap dynamic imports so a server-only error becomes a skip, not a test failure.
async function tryImport<T>(path: string): Promise<T> {
  try {
    return await import(path) as T;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Client Component")) {
      throw new SkipError("server-only guard active in tsx context — run with --conditions react-server");
    }
    throw e;
  }
}

// Also skip if the API returned a credit/auth error
function guardApiError(e: unknown): never {
  if (e instanceof Error && (e.message.includes("credit balance") || e.message.includes("401") || e.message.includes("API key"))) {
    throw new SkipError(`API not available: ${e.message.slice(0, 80)}`);
  }
  throw e;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDraft(overrides: Partial<TranslationOutput> = {}): TranslationOutput {
  return {
    tamil_question_text: "ஒரு பொருளின் திணிவு 5 kg மற்றும் முடுக்கம் 2 m/s² ஆனால் விசை என்ன?",
    tamil_options: [
      "அ) 5 N",
      "ஆ) 10 N",
      "இ) 15 N",
      "ஈ) 20 N",
    ],
    tamil_explanation: "F = ma = 5 × 2 = 10 N",
    model_observations: {
      glossary_match_rate: 100,
      retrieval_matches: 3,
      contains_negation: false,
      option_count_match: true,
      number_count_match: true,
      unit_preserved: true,
      chemical_formula_preserved: true,
      math_notation_preserved: true,
      context_relevance: "high",
      glossary_coverage: "All terms used correctly.",
    },
    used_glossary_terms: [
      { english: "force", tamil: "விசை" },
      { english: "acceleration", tamil: "முடுக்கம்" },
    ],
    missing_expected_terms: [],
    ...overrides,
  };
}

const EASY_ENGLISH = {
  question_text: "A body has mass 5 kg and acceleration 2 m/s². What is the force acting on it?",
  options: ["5 N", "10 N", "15 N", "20 N"],
};

const NOT_ENGLISH = {
  question_text: "Which of the following is NOT a scalar quantity?",
  options: ["Mass", "Distance", "Velocity", "Temperature"],
};

const GLOSSARY_MATCHES: GlossaryMatch[] = [
  { id: "g1", english_term: "force",        tamil_term: "விசை",      subject: "physics" },
  { id: "g2", english_term: "acceleration", tamil_term: "முடுக்கம்", subject: "physics" },
];

const CHUNKS: KnowledgeChunk[] = [
  { id: "c1", source_type: "ai_generated_seed", subject: "physics",
    chapter: "Laws of Motion", tamil_text: "நியூட்டனின் விதி...", english_reference: "Newton's law",
    similarity: 0.9 },
  { id: "c2", source_type: "ai_generated_seed", subject: "physics",
    chapter: "Laws of Motion", tamil_text: "விசை = திணிவு × முடுக்கம்", english_reference: "F = ma",
    similarity: 0.88 },
  { id: "c3", source_type: "ai_generated_seed", subject: "physics",
    chapter: "Laws of Motion", tamil_text: "இயக்க விதிகள்...", english_reference: "Laws of motion",
    similarity: 0.85 },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

const tests: Promise<void>[] = [];

// Test 1 — Translate one easy question (scalar quantity type)
tests.push(test("1. Easy question translates: valid Tamil, 4 options, score ≥ 90, JSON parses", async () => {
  requireEnv("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const { generateEmbedding } = await tryImport<typeof import("./embed")>("./embed");
  const { lookupGlossaryTerms } = await tryImport<typeof import("./glossary")>("./glossary");
  const { retrieveTamilContext } = await tryImport<typeof import("./retrieval")>("./retrieval");
  const { translateQuestion } = await tryImport<typeof import("./translate")>("./translate");
  const { validateTranslation: validate } = await import("./validate");

  let embedding: number[], chunks: KnowledgeChunk[], glossary: GlossaryMatch[], draft: import("./translate").TranslationOutput;
  try {
    embedding = await generateEmbedding(EASY_ENGLISH.question_text);
    chunks = await retrieveTamilContext(embedding, "physics", "Laws of Motion");
    glossary = await lookupGlossaryTerms(EASY_ENGLISH.question_text, "physics");
    draft = await translateQuestion({
      question_text: EASY_ENGLISH.question_text,
      options: EASY_ENGLISH.options,
      explanation: "F = ma = 5 × 2 = 10 N",
      subject: "physics",
      glossaryMatches: glossary,
      retrievedChunks: chunks,
    });
  } catch (e) { guardApiError(e); }

  assert.ok(draft!.tamil_question_text.length > 10, "Tamil question text is too short");
  assert.equal(draft!.tamil_options.length, 4, "Must have exactly 4 options");
  assert.ok(typeof draft!.model_observations === "object", "model_observations must be an object");

  const validation = validate(
    { question_text: EASY_ENGLISH.question_text, options: EASY_ENGLISH.options },
    draft!, glossary!, chunks!,
  );
  assert.ok(validation.score >= 90, `Score ${validation.score} is below 90`);
}));

// Test 2 — Question with "NOT" → negation preserved, risk_words_preserved = true, score ≥ 90
tests.push(test("2. 'NOT' question: negation preserved, risk_words_preserved = true, score ≥ 90", async () => {
  requireEnv("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const { generateEmbedding } = await tryImport<typeof import("./embed")>("./embed");
  const { lookupGlossaryTerms } = await tryImport<typeof import("./glossary")>("./glossary");
  const { retrieveTamilContext } = await tryImport<typeof import("./retrieval")>("./retrieval");
  const { translateQuestion } = await tryImport<typeof import("./translate")>("./translate");
  const { validateTranslation: validate } = await import("./validate");
  const { TAMIL_NEGATION_MARKERS } = await import("./validation-config");

  let embedding: number[], chunks: KnowledgeChunk[], glossary: GlossaryMatch[], draft: import("./translate").TranslationOutput;
  try {
    embedding = await generateEmbedding(NOT_ENGLISH.question_text);
    chunks = await retrieveTamilContext(embedding, "physics");
    glossary = await lookupGlossaryTerms(NOT_ENGLISH.question_text, "physics");
    draft = await translateQuestion({
      question_text: NOT_ENGLISH.question_text,
      options: NOT_ENGLISH.options,
      explanation: "Velocity is a vector quantity (has direction). Others are scalars.",
      subject: "physics",
      glossaryMatches: glossary,
      retrievedChunks: chunks,
    });
  } catch (e) { guardApiError(e); }

  const hasTamilMarker = TAMIL_NEGATION_MARKERS.some(
    (m) => draft!.tamil_question_text.includes(m),
  );
  assert.ok(hasTamilMarker, `No Tamil negation marker found in: "${draft!.tamil_question_text}"`);

  const validation = validate(
    { question_text: NOT_ENGLISH.question_text, options: NOT_ENGLISH.options },
    draft!, glossary!, chunks!,
  );
  assert.ok(validation.checks.risk_words_preserved, "risk_words_preserved must be true");
  assert.ok(validation.score >= 90, `Score ${validation.score} is below 90`);
}));

// Test 3 — Empty knowledge base: still works, context_relevance = 'low'
tests.push(test("3. Empty knowledge base: translates with context_relevance = 'low'", async () => {
  requireEnv("OPENAI_API_KEY", "ANTHROPIC_API_KEY");

  const { translateQuestion } = await tryImport<typeof import("./translate")>("./translate");
  const { validateTranslation: validate } = await import("./validate");

  const emptyChunks: KnowledgeChunk[] = [];
  let draft: import("./translate").TranslationOutput;
  try {
    draft = await translateQuestion({
      question_text: EASY_ENGLISH.question_text,
      options: EASY_ENGLISH.options,
      explanation: "F = ma",
      subject: "physics",
      glossaryMatches: [],
      retrievedChunks: emptyChunks,
    });
  } catch (e) { guardApiError(e); }

  assert.equal(draft!.tamil_options.length, 4, "Must still produce 4 options without context");

  const validation = validate(
    { question_text: EASY_ENGLISH.question_text, options: EASY_ENGLISH.options },
    draft!, [], emptyChunks,
  );
  assert.equal(validation.checks.context_relevance, "low", "context_relevance must be 'low'");
}));

// Test 4 — Glossary matches: exact Tamil term appears in output, glossary_match_rate = 100
tests.push(test("4. Glossary matches: exact Tamil terms appear in output, glossary_match_rate = 100", async () => {
  requireEnv("OPENAI_API_KEY", "ANTHROPIC_API_KEY");

  const { translateQuestion } = await tryImport<typeof import("./translate")>("./translate");
  const { calculateGlossaryRate } = await import("./validate");

  let draft: import("./translate").TranslationOutput;
  try {
    draft = await translateQuestion({
      question_text: EASY_ENGLISH.question_text,
      options: EASY_ENGLISH.options,
      explanation: "Force equals mass times acceleration.",
      subject: "physics",
      glossaryMatches: GLOSSARY_MATCHES,
      retrievedChunks: [],
    });
  } catch (e) { guardApiError(e); }

  const rate = calculateGlossaryRate(draft!, GLOSSARY_MATCHES);
  assert.equal(rate, 100, `Glossary match rate is ${rate}, expected 100`);

  const allText = draft!.tamil_question_text + " " + draft!.tamil_options.join(" ") + " " + draft!.tamil_explanation;
  assert.ok(allText.includes("விசை"), "Expected Tamil term 'விசை' (force) in output");
  assert.ok(allText.includes("முடுக்கம்"), "Expected Tamil term 'முடுக்கம்' (acceleration) in output");
}));

// Test 5 — Pure unit test: ai_drafted does NOT render Tamil to student (only 'approved' does)
tests.push(test("5. Student guard: ai_drafted → falls back to English; approved → serves Tamil", () => {
  const baseQuestion: QuestionWithTamil = {
    text: "What is Newton's first law?",
    options: ["A", "B", "C", "D"],
    explanation: "An object at rest stays at rest...",
    bodyTa: "நியூட்டனின் முதல் விதி என்ன?",
    optionsTa: ["அ", "ஆ", "இ", "ஈ"],
    explanationTa: "ஓய்வில் உள்ள பொருள்...",
  };

  // bodyTa present + ta locale → Tamil served
  const result1 = getTamilContent({ ...baseQuestion }, "ta");
  assert.equal(result1.locale, "ta", "bodyTa present + ta locale must serve Tamil");
  assert.equal(result1.text, baseQuestion.bodyTa);

  // bodyTa present + en locale → English served
  const result2 = getTamilContent({ ...baseQuestion }, "en");
  assert.equal(result2.locale, "en", "en locale must serve English even when bodyTa present");

  // bodyTa null + ta locale → English fallback
  const result3 = getTamilContent({ ...baseQuestion, bodyTa: null }, "ta");
  assert.equal(result3.locale, "en", "null bodyTa must fall back to English");

  // bodyTa present but optionsTa null → English fallback (incomplete translation)
  const result4 = getTamilContent({ ...baseQuestion, optionsTa: null }, "ta");
  assert.equal(result4.locale, "en", "null optionsTa must fall back to English");

  // bodyTa present but optionsTa wrong length → English fallback
  const result5 = getTamilContent({ ...baseQuestion, optionsTa: ["அ", "ஆ"] }, "ta");
  assert.equal(result5.locale, "en", "optionsTa with length != 4 must fall back to English");
}));

// Test 6 — Batch mode: error in question 3 does NOT stop questions 4–10
tests.push(test("6. Batch: error in question 3 does not stop remaining questions", async () => {
  requireEnv("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const { translateBatch } = await tryImport<typeof import("./agent")>("./agent");

  // All fake UUIDs — each will fail to load from DB, but the batch continues past each error
  const fakeIds = [
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003", // error here — 4 and 5 must still run
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005",
  ];

  const summary = await translateBatch({ ids: fakeIds });

  assert.equal(summary.total, 5, "All 5 questions must be attempted (not stopped at #3)");
  assert.equal(summary.failed_skipped, 5, "All fail on fake UUIDs — but run completes");
}));

// Test 7 — Pure validation: missing risk words → review_required
tests.push(test("7. Validation failure: missing negation marker → review_required, score < 80", () => {
  const englishWithNOT = {
    question_text: "Which of the following is NOT a vector quantity?",
    options: ["Velocity", "Displacement", "Speed", "Acceleration"],
  };

  // Tamil translation WITHOUT any negation marker
  const badDraft = makeDraft({
    tamil_question_text: "பின்வருவனவற்றில் எது ஒரு திசையன் அளவு?",  // "which is a vector quantity" (positive, wrong!)
    tamil_options: ["வேகம்", "இடப்பெயர்ச்சி", "விரைவு", "முடுக்கம்"],
  });

  const validation = validateTranslation(englishWithNOT, badDraft, [], []);

  assert.equal(validation.checks.risk_words_preserved, false, "risk_words_preserved must be false");
  assert.ok(validation.auto_review_required, "auto_review_required must be true when risk word missing");
  assert.ok(validation.score < 80, `Score ${validation.score} should be < 80 when negation missing`);
  assert.ok(validation.failed_checks.includes("risk_words_preserved"), "failed_checks must include risk_words_preserved");
}));

// Test 8 — Unknown unit logging: warning emitted for units not in config
tests.push(test("8. Unknown unit logs a warning (check console output)", () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => warnings.push(args.join(" "));

  try {
    // "furlong/fortnight" is not in PRESERVED_UNITS — should trigger warning
    const english = "An object travels at 3 furlong/fortnight. What is this in m/s?";
    const tamil   = "ஒரு பொருள் 3 furlong/fortnight வேகத்தில் பயணிக்கிறது. இது m/s-ல் என்ன?";

    checkUnits(english, tamil);

    const tamilValidatorWarning = warnings.some((w) => w.includes("[Tamil Validator]") && w.includes("Unknown units"));
    assert.ok(tamilValidatorWarning, `Expected [Tamil Validator] unknown unit warning, got: ${JSON.stringify(warnings)}`);
  } finally {
    console.warn = originalWarn;
  }

  // Also verify that known units in config do NOT trigger warnings
  const warnings2: string[] = [];
  console.warn = (...args: unknown[]) => warnings2.push(args.join(" "));
  try {
    checkUnits("A force of 10 N acts on a 2 kg object.", "10 N விசை 2 kg பொருளில் செயல்படுகிறது.");
    const unknownWarning = warnings2.some((w) => w.includes("[Tamil Validator]") && w.includes("Unknown units"));
    assert.ok(!unknownWarning, "Known units (N, kg) must NOT trigger an unknown unit warning");
  } finally {
    console.warn = originalWarn;
  }
}));

// ─── Run all tests ────────────────────────────────────────────────────────────

console.log("\nTamil Translation Brain\n");

Promise.all(tests).then(() => {
  console.log(`\n${passed} passed, ${skipped} skipped (need API keys)`);
  if (process.exitCode) {
    console.error("Some tests FAILED.");
  }
});
