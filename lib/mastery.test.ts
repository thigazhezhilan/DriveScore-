/**
 * Unit tests for the Mastery Road engine (gates, earned-twice clearing, decay
 * regression, frontier detection, and cold-start safety).
 *
 * Zero-dependency: run with `npm test` (via tsx).
 */

import assert from "node:assert/strict";
import {
  computeChapterMastery,
  computeRoad,
  gatesForDifficulty,
  GATE_CONFIG,
  type ChapterAnswers,
  type Gate,
  type MasteryAnswer,
} from "./mastery";
import type { Difficulty } from "./types";

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

/** Build a list of answers at one difficulty. */
function answers(
  difficulty: Difficulty,
  specs: { correct: boolean; session: string; at?: number }[],
): MasteryAnswer[] {
  return specs.map((s, i) => ({
    difficulty,
    correct: s.correct,
    sessionId: s.session,
    at: s.at ?? i + 1,
  }));
}

/** Helper: n correct + m wrong at a difficulty, split across two sessions. */
function mix(
  difficulty: Difficulty,
  correct: number,
  wrong: number,
): MasteryAnswer[] {
  const specs: { correct: boolean; session: string; at?: number }[] = [];
  let at = 1;
  for (let i = 0; i < correct; i++)
    specs.push({ correct: true, session: i % 2 === 0 ? "s1" : "s2", at: at++ });
  for (let i = 0; i < wrong; i++)
    specs.push({ correct: false, session: i % 2 === 0 ? "s1" : "s2", at: at++ });
  return answers(difficulty, specs);
}

const gate = (m: ReturnType<typeof computeChapterMastery>, g: Gate) =>
  m.gates.find((x) => x.gate === g)!;

console.log("\nMastery Road engine\n");

// ── difficulty → gate mapping ────────────────────────────────────────────────

test("a Hard answer feeds both NEET_LEVEL and HARD gates", () => {
  assert.deepEqual(gatesForDifficulty("Easy"), ["FOUNDATION"]);
  assert.deepEqual(gatesForDifficulty("Medium"), ["APPLICATION"]);
  assert.deepEqual(gatesForDifficulty("Hard"), ["NEET_LEVEL", "HARD"]);
});

// ── earned twice, not once ───────────────────────────────────────────────────

test("a single correct answer does NOT clear a gate (shows partial progress)", () => {
  const m = computeChapterMastery("Physics", "Laws of Motion", mix("Easy", 1, 0));
  const f = gate(m, "FOUNDATION");
  assert.notEqual(f.status, "CLEARED");
  assert.equal(f.status, "IN_PROGRESS");
  assert.equal(f.strong, 1);
  assert.equal(f.required, GATE_CONFIG.FOUNDATION.requiredStrong);
});

test("a single correct HARD answer does NOT clear NEET-level or Mastery", () => {
  const m = computeChapterMastery(
    "Physics",
    "Gravitation",
    answers("Hard", [{ correct: true, session: "s1" }]),
  );
  assert.notEqual(gate(m, "NEET_LEVEL").status, "CLEARED");
  assert.notEqual(gate(m, "HARD").status, "CLEARED");
});

test("clears when strong-count + 2-session + accuracy thresholds are ALL met", () => {
  // 4 correct Easy across s1 + s2, 100% accuracy.
  const m = computeChapterMastery("Physics", "Laws of Motion", mix("Easy", 4, 0));
  assert.equal(gate(m, "FOUNDATION").status, "CLEARED");
  assert.equal(m.highestClearedIndex, 0);
});

test("does NOT clear if all strong answers are in a single session", () => {
  const m = computeChapterMastery(
    "Physics",
    "Laws of Motion",
    answers("Easy", [
      { correct: true, session: "s1" },
      { correct: true, session: "s1" },
      { correct: true, session: "s1" },
      { correct: true, session: "s1" },
    ]),
  );
  assert.equal(gate(m, "FOUNDATION").status, "IN_PROGRESS");
});

test("does NOT clear if accuracy is below threshold despite enough strong answers", () => {
  // 4 correct + 6 wrong = 40% accuracy across two sessions.
  const m = computeChapterMastery("Physics", "Laws of Motion", mix("Easy", 4, 6));
  assert.equal(gate(m, "FOUNDATION").status, "IN_PROGRESS");
});

test("higher gates stay LOCKED until the previous gate is cleared", () => {
  // Plenty of strong Medium answers, but Foundation never cleared (no Easy).
  const m = computeChapterMastery("Physics", "Laws of Motion", mix("Medium", 6, 0));
  assert.equal(gate(m, "APPLICATION").status, "LOCKED");
});

// ── decay-aware regression (backward movement) ───────────────────────────────

test("a cleared gate regresses to NEEDS_REINFORCEMENT when RECENT accuracy decays", () => {
  // 8 correct early (at 1..8), then 3 wrong most-recently (at 100..102).
  const early = answers(
    "Easy",
    Array.from({ length: 8 }, (_, i) => ({
      correct: true,
      session: i < 4 ? "s1" : "s2",
      at: i + 1,
    })),
  );
  const recent = answers("Easy", [
    { correct: false, session: "s3", at: 100 },
    { correct: false, session: "s3", at: 101 },
    { correct: false, session: "s3", at: 102 },
  ]);
  const m = computeChapterMastery("Physics", "Laws of Motion", [...early, ...recent]);
  const f = gate(m, "FOUNDATION");
  // Overall it still met the bar (acc 8/11 ≈ 0.73), but recent accuracy tanked.
  assert.equal(f.status, "NEEDS_REINFORCEMENT");
  // Standing drops — the map moved backward.
  assert.equal(m.highestClearedIndex, -1);
  assert.ok(m.reinforcement);
});

// ── frontier detection ───────────────────────────────────────────────────────

test("frontier picks the gate closest to clearing across chapters", () => {
  const chapters: ChapterAnswers[] = [
    // 1 of 4 strong → ratio 0.25
    { subject: "Physics", chapter: "Laws of Motion", answers: mix("Easy", 1, 0) },
    // 3 of 4 strong → ratio 0.75 (closest)
    { subject: "Physics", chapter: "Gravitation", answers: mix("Easy", 3, 0) },
  ];
  const road = computeRoad(chapters);
  assert.ok(road.frontier);
  assert.equal(road.frontier!.chapter, "Gravitation");
  assert.equal(road.frontier!.gate, "FOUNDATION");
});

// ── cold start / zero history ────────────────────────────────────────────────

test("zero history renders without error (empty subjects, null frontier)", () => {
  const road = computeRoad([]);
  assert.deepEqual(road.subjects, []);
  assert.equal(road.frontier, null);
  assert.deepEqual(road.reinforcements, []);
});

test("a brand-new student with one mock gets a reachable first quest", () => {
  const road = computeRoad([
    { subject: "Biology", chapter: "Cell Cycle and Cell Division", answers: mix("Easy", 2, 1) },
  ]);
  assert.ok(road.frontier);
  assert.equal(road.frontier!.chapter, "Cell Cycle and Cell Division");
  assert.equal(road.frontier!.gate, "FOUNDATION");
  // No negative progress, no crash.
  const f = road.subjects[0].chapters[0].gates[0];
  assert.ok(f.progressPct >= 0 && f.progressPct <= 100);
});

test("an empty (untouched) chapter computes safely: Foundation open, rest locked", () => {
  const m = computeChapterMastery("Chemistry", "Equilibrium", []);
  assert.equal(m.touched, false);
  assert.equal(gate(m, "FOUNDATION").status, "IN_PROGRESS");
  assert.equal(gate(m, "APPLICATION").status, "LOCKED");
  assert.equal(gate(m, "NEET_LEVEL").status, "LOCKED");
  assert.equal(gate(m, "HARD").status, "LOCKED");
});

console.log(`\n${passed} checks passed.\n`);
