/**
 * Unit tests for the Diagnosis Engine v2 additions: SELF_DOUBT detection and
 * the confidence score. The classic `diagnose()` behaviour is covered by
 * `diagnose.test.ts`; here we exercise the `diagnoseDetailed()` wrapper.
 *
 * Zero-dependency: run with `npm test` (via tsx).
 */

import assert from "node:assert/strict";
import { diagnose, diagnoseDetailed } from "./diagnose";
import type { Difficulty, Question } from "./types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    console.error(`  \x1b[31m✗ ${name}\x1b[0m`);
    console.error(err);
    process.exitCode = 1;
  }
}

/** Throwaway question; correct answer = index 1. */
function q(difficulty: Difficulty, parTimeSec = 60): Question {
  return {
    id: "q",
    subject: "Physics",
    chapter: "Test Chapter",
    concept: "Test Concept",
    difficulty,
    parTimeSec,
    text: "?",
    options: ["a", "b", "c", "d"],
    answerIndex: 1,
  };
}

console.log("\nDiagnosis Engine v2 (confidence + self-doubt)\n");

// ── SELF_DOUBT ───────────────────────────────────────────────────────────────

test("first correct, final wrong -> SELF_DOUBT (with high confidence)", () => {
  const r = diagnoseDetailed(q("Medium", 60), 0 /* wrong */, 50, 1 /* correct first */);
  assert.equal(r.category, "SELF_DOUBT");
  assert.ok(r.confidence >= 90, `expected high confidence, got ${r.confidence}`);
});

test("SELF_DOUBT overrides CARELESS (wrong on Easy after a correct first touch)", () => {
  const r = diagnoseDetailed(q("Easy", 60), 0 /* wrong */, 10, 1 /* correct first */);
  assert.equal(r.category, "SELF_DOUBT");
});

test("first wrong, final wrong -> falls back to the classic category", () => {
  const r = diagnoseDetailed(q("Hard", 60), 0 /* wrong */, 50, 2 /* also wrong first */);
  assert.equal(r.category, "CONCEPT_GAP");
});

test("first correct, final correct (kept it) -> not self-doubt", () => {
  const r = diagnoseDetailed(q("Medium", 60), 1 /* correct */, 50, 1);
  assert.equal(r.category, "SOLID");
});

test("touched correct then cleared (final blank) -> TIME_MANAGEMENT, not self-doubt", () => {
  const r = diagnoseDetailed(q("Medium", 60), null /* blank */, 30, 1 /* correct first */);
  assert.equal(r.category, "TIME_MANAGEMENT");
});

test("no first-answer data -> identical category to classic diagnose() (back-compat)", () => {
  const cases: [Difficulty, number | null, number][] = [
    ["Easy", 0, 10],
    ["Medium", 2, 15],
    ["Hard", 0, 50],
    ["Medium", 1, 90],
    ["Medium", 1, 20],
    ["Hard", null, 0],
  ];
  for (const [d, picked, t] of cases) {
    const question = q(d, 60);
    // undefined first-answer
    assert.equal(diagnoseDetailed(question, picked, t).category, diagnose(question, picked, t));
    // explicit null first-answer
    assert.equal(diagnoseDetailed(question, picked, t, null).category, diagnose(question, picked, t));
  }
});

// ── Confidence tie-breaks ────────────────────────────────────────────────────

test("GUESS: very fast is more confident than barely-rushed", () => {
  // par 60 -> rush threshold 24s. Both are GUESS (wrong, Medium, rushed).
  const veryFast = diagnoseDetailed(q("Medium", 60), 0, 3);
  const barely = diagnoseDetailed(q("Medium", 60), 0, 23);
  assert.equal(veryFast.category, "GUESS");
  assert.equal(barely.category, "GUESS");
  assert.ok(
    veryFast.confidence > barely.confidence,
    `expected ${veryFast.confidence} > ${barely.confidence}`,
  );
});

test("TOO_SLOW: way over par is more confident than just over the threshold", () => {
  // par 60 -> slow threshold 84s.
  const justOver = diagnoseDetailed(q("Medium", 60), 1, 85);
  const wayOver = diagnoseDetailed(q("Medium", 60), 1, 200);
  assert.equal(justOver.category, "TOO_SLOW");
  assert.equal(wayOver.category, "TOO_SLOW");
  assert.ok(wayOver.confidence > justOver.confidence);
});

test("CONCEPT_GAP: a Hard gap is more confident than a Medium gap at the same pace", () => {
  const hard = diagnoseDetailed(q("Hard", 60), 0, 50);
  const medium = diagnoseDetailed(q("Medium", 60), 0, 50);
  assert.equal(hard.category, "CONCEPT_GAP");
  assert.equal(medium.category, "CONCEPT_GAP");
  assert.ok(hard.confidence > medium.confidence);
});

test("CARELESS: a fast slip is more confident than a slow miss on an easy question", () => {
  const fast = diagnoseDetailed(q("Easy", 60), 0, 5);
  const slow = diagnoseDetailed(q("Easy", 60), 0, 120);
  assert.equal(fast.category, "CARELESS");
  assert.equal(slow.category, "CARELESS");
  assert.ok(fast.confidence > slow.confidence);
});

test("confidence is always within [0, 100] and reason is non-empty", () => {
  const matrix: [Difficulty, number | null, number, number | null][] = [
    ["Easy", 0, 5, null],
    ["Medium", 2, 15, null],
    ["Hard", 0, 50, null],
    ["Medium", 1, 90, null],
    ["Medium", 1, 20, null],
    ["Hard", null, 0, null],
    ["Medium", 0, 50, 1], // self-doubt
  ];
  for (const [d, picked, t, first] of matrix) {
    const r = diagnoseDetailed(q(d, 60), picked, t, first);
    assert.ok(r.confidence >= 0 && r.confidence <= 100, `out of range: ${r.confidence}`);
    assert.ok(r.confidenceReason.length > 0);
  }
});

console.log(`\n${passed} checks passed.\n`);
