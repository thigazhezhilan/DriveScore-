/**
 * Unit tests for the teacher diagnosis rollup.
 *
 * Tests the pure rollupAnswersToDiagnosis() function in isolation — no DB,
 * no Supabase. Run with `npm test` via tsx.
 */

import assert from "node:assert/strict";
import { rollupAnswersToDiagnosis } from "./teacher-rollup";
import type { AnswerForRollup } from "./teacher-rollup";
import type { Difficulty, Question, Subject } from "./types";

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

function makeQ(
  subject: Subject = "Physics",
  chapter = "Current Electricity",
  difficulty: Difficulty = "Medium",
  parTimeSec = 60,
): Question {
  return {
    id: `${subject}-${chapter}-${difficulty}`,
    subject,
    chapter,
    concept: "Test",
    difficulty,
    parTimeSec,
    text: "?",
    options: ["a", "b", "c", "d"],
    answerIndex: 0,
    imageUrl: null,
  };
}

function makeAns(
  studentId: string,
  question: Question,
  pickedIndex: number | null,
  timeSec: number,
  firstPickedIndex: number | null = null,
): AnswerForRollup {
  return {
    attemptId: `attempt-${studentId}-${question.id}`,
    studentId,
    question,
    pickedIndex,
    timeSec,
    firstPickedIndex,
  };
}

console.log("\nTeacher Diagnosis Rollup\n");

test("empty answer list returns empty object", () => {
  assert.deepEqual(rollupAnswersToDiagnosis([]), {});
});

test("SOLID answers are excluded (correct + on-pace = no problem)", () => {
  const q = makeQ();
  // answerIndex = 0, pickedIndex = 0 → correct; timeSec 30 < par 60 * 1.4 = 84 → SOLID
  const result = rollupAnswersToDiagnosis([makeAns("s1", q, 0, 30)]);
  assert.deepEqual(result, {});
});

test("counts distinct students, not raw answer count", () => {
  const q1 = makeQ("Physics", "Current Electricity", "Medium");
  const q2 = { ...q1, id: "q2-unique" };
  // s1 has CONCEPT_GAP on 2 questions in the same chapter → counts as 1
  // s2 has CONCEPT_GAP on 1 question → counts as 1
  // Total: 2 distinct students, not 3 answers
  const answers: AnswerForRollup[] = [
    makeAns("s1", q1, 1, 80), // wrong, medium, 80s > rush=24s → CONCEPT_GAP
    makeAns("s1", q2, 1, 80), // same student, same chapter
    makeAns("s2", q1, 1, 80), // different student
  ];
  const result = rollupAnswersToDiagnosis(answers);
  assert.equal(
    result["Physics|Current Electricity"]?.CONCEPT_GAP,
    2,
    "2 distinct students, not 3 answers",
  );
});

test("same student across multiple recent attempts counts once per chapter-category", () => {
  const q = makeQ("Chemistry", "Electrochemistry", "Medium");
  // s1 submits 2 attempts this week, both with CONCEPT_GAP on same chapter
  const answers: AnswerForRollup[] = [
    { ...makeAns("s1", q, 1, 80), attemptId: "attempt-1" },
    { ...makeAns("s1", q, 1, 80), attemptId: "attempt-2" },
  ];
  const result = rollupAnswersToDiagnosis(answers);
  assert.equal(result["Chemistry|Electrochemistry"]?.CONCEPT_GAP, 1);
});

test("single student single category produces a valid entry", () => {
  const q = makeQ("Biology", "Photosynthesis", "Easy");
  // wrong + easy = CARELESS (rule 4 in diagnose())
  const result = rollupAnswersToDiagnosis([makeAns("s1", q, 1, 20)]);
  const key = "Biology|Photosynthesis";
  assert.equal(result[key]?.CARELESS, 1);
  assert.equal(result[key]?.CONCEPT_GAP, undefined, "no CONCEPT_GAP when only CARELESS");
});

test("multiple categories in one chapter are counted independently", () => {
  const q = makeQ("Chemistry", "Electrochemistry", "Medium", 60);
  // s1: wrong, 80s (not rushed) → CONCEPT_GAP
  // s2: wrong, 10s (< rush threshold 24s) → GUESS
  // s3: wrong, 80s → CONCEPT_GAP
  const answers: AnswerForRollup[] = [
    makeAns("s1", q, 1, 80),
    makeAns("s2", q, 1, 10),
    makeAns("s3", q, 1, 80),
  ];
  const result = rollupAnswersToDiagnosis(answers);
  const key = "Chemistry|Electrochemistry";
  assert.equal(result[key]?.CONCEPT_GAP, 2);
  assert.equal(result[key]?.GUESS, 1);
});

test("chapters with same name in different subjects are keyed separately", () => {
  const physQ = makeQ("Physics", "Optics", "Medium");
  const bioQ = makeQ("Biology", "Optics", "Medium");
  const answers: AnswerForRollup[] = [
    makeAns("s1", physQ, 1, 80),
    makeAns("s2", bioQ, 1, 80),
  ];
  const result = rollupAnswersToDiagnosis(answers);
  assert.equal(result["Physics|Optics"]?.CONCEPT_GAP, 1);
  assert.equal(result["Biology|Optics"]?.CONCEPT_GAP, 1);
  assert.equal(Object.keys(result).length, 2, "two separate keys");
});

test("SELF_DOUBT is counted when first-answer data shows change from correct", () => {
  const q = makeQ("Physics", "Motion", "Medium");
  // pickedIndex=1 (wrong), firstPickedIndex=0 (correct) → SELF_DOUBT
  const result = rollupAnswersToDiagnosis([
    makeAns("s1", q, 1, 80, 0),
  ]);
  assert.equal(result["Physics|Motion"]?.SELF_DOUBT, 1);
  assert.equal(result["Physics|Motion"]?.CONCEPT_GAP, undefined);
});

console.log(`\n${passed} tests passed.\n`);
