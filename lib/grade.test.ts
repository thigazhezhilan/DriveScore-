/**
 * Unit tests for the report aggregation v2 additions: speed archetypes, the
 * root-cause (marks-lost) ranking, confidence aggregation, and SELF_DOUBT
 * flowing through `buildReport`. Pure — no DB, no React.
 *
 * Zero-dependency: run with `npm test` (via tsx).
 */

import assert from "node:assert/strict";
import { buildReport, classifyArchetype } from "./grade";
import type { Attempt, Difficulty, Question } from "./types";

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

/** Question with correct answer at index 1. */
function makeQ(id: string, difficulty: Difficulty = "Medium", par = 60): Question {
  return {
    id,
    subject: "Physics",
    chapter: "Kinematics",
    concept: `Concept ${id}`,
    difficulty,
    parTimeSec: par,
    text: "?",
    options: ["a", "b", "c", "d"],
    answerIndex: 1,
  };
}

/** Attempt helpers. `correct` picks index 1; `wrong` picks 0; `blank` null. */
const correct = (id: string, timeSec: number): Attempt => ({ questionId: id, pickedIndex: 1, timeSec });
const wrong = (id: string, timeSec: number): Attempt => ({ questionId: id, pickedIndex: 0, timeSec });
const blank = (id: string): Attempt => ({ questionId: id, pickedIndex: null, timeSec: 0 });

/** Build N questions + paired attempts via a per-index factory. */
function build(n: number, factory: (i: number) => { q: Question; a: Attempt }) {
  const questions: Question[] = [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < n; i++) {
    const { q, a } = factory(i);
    questions.push(q);
    attempts.push(a);
  }
  return { questions, attempts };
}

console.log("\nReport aggregation v2 (archetypes + root causes)\n");

// ── Archetypes ───────────────────────────────────────────────────────────────

test("too few attempted questions -> no archetype (null, no crash)", () => {
  const { questions, attempts } = build(4, (i) => {
    const q = makeQ(`q${i}`);
    return { q, a: correct(q.id, 60) };
  });
  const report = buildReport(questions, attempts);
  assert.equal(report.archetype, null);
});

test("high accuracy + slow -> SNIPER", () => {
  const { questions, attempts } = build(6, (i) => {
    const q = makeQ(`q${i}`, "Medium", 60);
    return { q, a: correct(q.id, 96) }; // 96 > 60*1.15
  });
  const report = buildReport(questions, attempts);
  assert.equal(report.archetype?.type, "SNIPER");
});

test("fast + low accuracy -> GAMBLER", () => {
  // 2 of 6 correct (33%), all answered very fast; correct ones spread across
  // head/tail so the panic check doesn't fire.
  const { questions, attempts } = build(6, (i) => {
    const q = makeQ(`q${i}`, "Medium", 60);
    const isCorrect = i === 0 || i === 4;
    return { q, a: isCorrect ? correct(q.id, 12) : wrong(q.id, 12) };
  });
  const report = buildReport(questions, attempts);
  assert.equal(report.archetype?.type, "GAMBLER");
});

test("normal pace + middling accuracy -> BALANCED", () => {
  const { questions, attempts } = build(6, (i) => {
    const q = makeQ(`q${i}`, "Medium", 60);
    const isCorrect = i % 2 === 0; // 0,2,4 correct; spread evenly
    return { q, a: isCorrect ? correct(q.id, 60) : wrong(q.id, 60) };
  });
  const report = buildReport(questions, attempts);
  assert.equal(report.archetype?.type, "BALANCED");
});

test("accuracy collapses in the final fifth -> PANICKER", () => {
  // 10 questions: first 8 all correct, last 2 wrong -> sharp tail drop.
  const { questions, attempts } = build(10, (i) => {
    const q = makeQ(`q${i}`, "Medium", 60);
    return { q, a: i < 8 ? correct(q.id, 60) : wrong(q.id, 60) };
  });
  const report = buildReport(questions, attempts);
  assert.equal(report.archetype?.type, "PANICKER");
});

test("classifyArchetype matches buildReport's archetype", () => {
  const { questions, attempts } = build(6, (i) => {
    const q = makeQ(`q${i}`, "Medium", 60);
    return { q, a: correct(q.id, 96) };
  });
  const report = buildReport(questions, attempts);
  assert.deepEqual(classifyArchetype(report.items), report.archetype);
});

// ── Root-cause ranking ───────────────────────────────────────────────────────

test("root causes rank by marks lost; correct/too-slow contribute nothing", () => {
  const qGap = makeQ("gap", "Medium", 60);
  const qBlank = makeQ("blank", "Medium", 60);
  const qSolid = makeQ("solid", "Medium", 60);
  const qSlow = makeQ("slow", "Medium", 60);
  const report = buildReport(
    [qGap, qBlank, qSolid, qSlow],
    [wrong("gap", 50), blank("blank"), correct("solid", 30), correct("slow", 200)],
  );
  assert.deepEqual(report.rootCauses, [
    { category: "CONCEPT_GAP", marksLost: 5 }, // wrong = 4 - (-1)
    { category: "TIME_MANAGEMENT", marksLost: 4 }, // blank = 4 - 0
  ]);
});

test("no answers -> empty root causes, null archetype, no groups (no crash)", () => {
  const report = buildReport([], []);
  assert.deepEqual(report.rootCauses, []);
  assert.equal(report.archetype, null);
  assert.deepEqual(report.groups, []);
});

// ── Confidence aggregation + SELF_DOUBT integration ──────────────────────────

test("every group carries a sane avgConfidence (0–100)", () => {
  const { questions, attempts } = build(6, (i) => {
    const q = makeQ(`q${i}`, "Hard", 60);
    return { q, a: wrong(q.id, 50) };
  });
  const report = buildReport(questions, attempts);
  assert.ok(report.groups.length > 0);
  for (const g of report.groups) {
    assert.ok(g.avgConfidence >= 0 && g.avgConfidence <= 100);
  }
});

test("SELF_DOUBT flows into groups + weak chapters but NOT re-teach", () => {
  const q1 = makeQ("sd", "Medium", 60);
  const attempt: Attempt = { questionId: "sd", pickedIndex: 0, timeSec: 50, firstPickedIndex: 1 };
  const report = buildReport([q1], [attempt]);
  assert.ok(report.groups.some((g) => g.category === "SELF_DOUBT"));
  assert.ok(report.weakChapters.some((w) => w.category === "SELF_DOUBT"));
  assert.ok(!report.reTeachChapters.some((w) => w.category === "SELF_DOUBT"));
});

console.log(`\n${passed} checks passed.\n`);
