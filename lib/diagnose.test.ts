/**
 * Unit tests for the Diagnosis Engine.
 *
 * Zero-dependency: run with `npm test` (via tsx). Uses Node's built-in
 * assert. Every one of the problem categories + SOLID is exercised, plus
 * the ordering edge-cases between the rules.
 */

import assert from "node:assert/strict";
import { diagnose, RUSH_FACTOR, SLOW_FACTOR } from "./diagnose";
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

/** Build a throwaway question with a given difficulty + par time. */
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
    answerIndex: 1, // correct = index 1
  };
}

console.log("\nDiagnosis Engine\n");

test("unattempted -> TIME_MANAGEMENT (always wins first)", () => {
  // Even an Easy question, left blank, is time management.
  assert.equal(diagnose(q("Easy"), null, 0), "TIME_MANAGEMENT");
  assert.equal(diagnose(q("Hard"), null, 999), "TIME_MANAGEMENT");
});

test("correct & slow -> TOO_SLOW", () => {
  // par 60s, slow threshold = 60 * 1.4 = 84s
  assert.equal(diagnose(q("Medium", 60), 1, 90), "TOO_SLOW");
});

test("correct & fast -> SOLID", () => {
  assert.equal(diagnose(q("Medium", 60), 1, 20), "SOLID");
});

test("correct & on-pace -> SOLID", () => {
  assert.equal(diagnose(q("Medium", 60), 1, 50), "SOLID");
});

test("correct exactly at slow threshold -> SOLID (strictly greater is slow)", () => {
  // 60 * 1.4 = 84 exactly; rule is `>` so 84 is NOT slow.
  assert.equal(diagnose(q("Medium", 60), 1, 84), "SOLID");
  assert.equal(diagnose(q("Medium", 60), 1, 85), "TOO_SLOW");
});

test("wrong on Easy, answered fast -> CARELESS", () => {
  assert.equal(diagnose(q("Easy", 60), 0, 10), "CARELESS");
});

test("wrong on Easy, answered slowly -> CARELESS (difficulty wins on Easy)", () => {
  assert.equal(diagnose(q("Easy", 60), 0, 200), "CARELESS");
});

test("REGRESSION: wrong on Hard, answered very fast (< 0.4 par) -> GUESS (not CARELESS)", () => {
  // The "SN1 vs SN2 wrong in 7s" bug: par 100s, rush threshold = 40s.
  const result = diagnose(q("Hard", 100), 0, 7);
  assert.equal(result, "GUESS");
  assert.notEqual(result, "CARELESS");
});

test("wrong on Medium, rushed (< 0.4 par) -> GUESS", () => {
  // par 60s, rush threshold = 24s; answered in 15s.
  assert.equal(diagnose(q("Medium", 60), 2, 15), "GUESS");
});

test("wrong on Hard at normal pace -> CONCEPT_GAP", () => {
  assert.equal(diagnose(q("Hard", 60), 0, 50), "CONCEPT_GAP");
});

test("wrong on Hard, slow -> CONCEPT_GAP (worked it and still missed)", () => {
  assert.equal(diagnose(q("Hard", 60), 2, 120), "CONCEPT_GAP");
});

test("wrong on Medium exactly at rush threshold -> CONCEPT_GAP (strictly less is rushed)", () => {
  // 60 * 0.4 = 24 exactly; rule is `<` so 24 is NOT rushed.
  assert.equal(diagnose(q("Medium", 60), 2, 24), "CONCEPT_GAP");
  assert.equal(diagnose(q("Medium", 60), 2, 23), "GUESS");
});

test("factors are the documented constants", () => {
  assert.equal(SLOW_FACTOR, 1.4);
  assert.equal(RUSH_FACTOR, 0.4);
});

console.log(`\n${passed} checks passed.\n`);
