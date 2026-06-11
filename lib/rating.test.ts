/**
 * Unit tests for the Skill Rating Engine.
 *
 * Zero-dependency: run with `npm test` (via tsx). Uses Node's built-in assert.
 * Covers the Elo invariants (fairness), the K-factor switch, the rating floor,
 * sticky level resolution, exam-weighted overall, and the anti-farming rule.
 */

import assert from "node:assert/strict";
import {
  applyAttempt,
  applyOne,
  CALIBRATION_QUESTIONS,
  DEMOTION_BUFFER,
  expectedScore,
  kFactor,
  K_CALIBRATION,
  K_STABLE,
  levelFor,
  levelProgress,
  overallRating,
  questionRating,
  RATING_FLOOR,
  START_RATING,
  type RatingInput,
  type SubjectState,
} from "./rating";

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

const fresh = (rating = START_RATING, questionsRated = 0): SubjectState => ({
  rating,
  questionsRated,
});

console.log("\nSkill Rating Engine\n");

// ── Elo fairness invariants ─────────────────────────────────────────────────

test("question rating rises with difficulty", () => {
  assert.equal(questionRating("Easy"), 800);
  assert.equal(questionRating("Medium"), 1100);
  assert.equal(questionRating("Hard"), 1400);
});

test("expected score is 0.5 for an equal match-up", () => {
  assert.equal(expectedScore(1000, 1000), 0.5);
});

test("expected score rises as the question gets easier than the student", () => {
  assert.ok(expectedScore(1000, 800) > 0.5);
  assert.ok(expectedScore(1000, 1400) < 0.5);
});

test("beating a HARDER question gains more than beating an easier one", () => {
  const hard = applyOne(fresh(), questionRating("Hard"), true).delta;
  const easy = applyOne(fresh(), questionRating("Easy"), true).delta;
  assert.ok(hard > easy, `hard +${hard} should beat easy +${easy}`);
});

test("FAIRNESS: correct on a far-below question gains ~nothing (volume farming dies)", () => {
  // A 1400-rated student answering an 800 question correctly: expected ~0.97.
  const gain = applyOne(fresh(1400, 50), questionRating("Easy"), true).delta;
  assert.ok(gain <= 1, `expected ~0 gain, got +${gain}`);
});

test("FAIRNESS: wrong on a hard question costs little (expected outcome)", () => {
  const loss = applyOne(fresh(), questionRating("Hard"), false).delta;
  assert.ok(loss < 0 && loss > -6, `expected a small loss, got ${loss}`);
});

test("FAIRNESS: wrong on an EASY question hurts (lost to a weaker opponent)", () => {
  const loss = applyOne(fresh(), questionRating("Easy"), false).delta;
  assert.ok(loss < -15, `expected a meaningful loss, got ${loss}`);
});

test("a correct answer never decreases, a wrong answer never increases", () => {
  assert.ok(applyOne(fresh(), questionRating("Easy"), true).delta >= 0);
  assert.ok(applyOne(fresh(), questionRating("Hard"), false).delta <= 0);
});

// ── K-factor + floor ─────────────────────────────────────────────────────────

test("K-factor is high during calibration, lower after", () => {
  assert.equal(kFactor(0), K_CALIBRATION);
  assert.equal(kFactor(CALIBRATION_QUESTIONS - 1), K_CALIBRATION);
  assert.equal(kFactor(CALIBRATION_QUESTIONS), K_STABLE);
});

test("calibrating students move faster than stable ones on the same match", () => {
  const calibrating = applyOne(fresh(1000, 0), questionRating("Hard"), true).delta;
  const stable = applyOne(fresh(1000, 50), questionRating("Hard"), true).delta;
  assert.ok(calibrating > stable);
});

test("rating cannot fall below the floor", () => {
  const res = applyOne(fresh(RATING_FLOOR + 2, 0), questionRating("Easy"), false);
  assert.equal(res.rating, RATING_FLOOR);
});

// ── Levels (sticky) ───────────────────────────────────────────────────────────

test("fresh resolution returns the natural band", () => {
  assert.equal(levelFor(1000, null).name, "Achiever");
  assert.equal(levelFor(1250, null).name, "Ranker");
  assert.equal(levelFor(1600, null).name, "White Coat");
  assert.equal(levelFor(500, null).name, "Aspirant");
});

test("promotion is immediate on crossing a floor", () => {
  // Currently Scholar, rating climbs into Ranker territory.
  assert.equal(levelFor(1200, "Scholar").name, "Ranker");
});

test("STICKY: a small dip below the band floor keeps the level", () => {
  // Ranker floor 1200; within the 25-pt buffer (>= 1175) stays Ranker.
  assert.equal(levelFor(1199, "Ranker").name, "Ranker");
  assert.equal(levelFor(1200 - DEMOTION_BUFFER, "Ranker").name, "Ranker");
});

test("STICKY: falling past the buffer demotes one band", () => {
  // 1174 < 1175 → drop to Scholar.
  assert.equal(levelFor(1174, "Ranker").name, "Scholar");
});

test("STICKY: a large crash demotes multiple bands consistently", () => {
  // From Ranker straight down to 900 → settles at Achiever (its natural band).
  assert.equal(levelFor(900, "Ranker").name, "Achiever");
});

test("levelProgress reports points to the next band", () => {
  const p = levelProgress(1000); // Achiever (900) → Scholar (1050)
  assert.equal(p.current.name, "Achiever");
  assert.equal(p.next?.name, "Scholar");
  assert.equal(p.pointsToNext, 50);
  assert.ok(p.pctToNext > 0 && p.pctToNext < 100);
});

test("levelProgress at the top band has no next level", () => {
  const p = levelProgress(1600);
  assert.equal(p.next, null);
  assert.equal(p.pointsToNext, null);
  assert.equal(p.pctToNext, 100);
});

// ── Overall (exam-weighted) ────────────────────────────────────────────────────

test("overall weights Biology at half", () => {
  // 0.5*1200 + 0.25*1000 + 0.25*1000 = 1100
  assert.equal(
    overallRating({ Biology: 1200, Physics: 1000, Chemistry: 1000 }),
    1100,
  );
});

test("overall treats untouched subjects as the start rating", () => {
  assert.equal(overallRating({ Physics: 1000 }), START_RATING);
});

// ── Attempt-level application ──────────────────────────────────────────────────

const baseState = (): Record<"Physics" | "Chemistry" | "Biology", SubjectState> => ({
  Physics: fresh(),
  Chemistry: fresh(),
  Biology: fresh(),
});

const input = (over: Partial<RatingInput>): RatingInput => ({
  questionId: "q",
  subject: "Physics",
  difficulty: "Medium",
  attempted: true,
  correct: true,
  previouslyCorrect: false,
  ...over,
});

test("blank answers play no match (rating untouched, no event)", () => {
  const res = applyAttempt(baseState(), [
    input({ questionId: "a", attempted: false, correct: false }),
  ]);
  assert.equal(res.deltas.length, 0);
  assert.equal(res.finalSubjects.Physics.rating, START_RATING);
  assert.equal(res.finalSubjects.Physics.questionsRated, 0);
});

test("ANTI-FARMING: a previously-correct question earns zero but is recorded", () => {
  const res = applyAttempt(baseState(), [
    input({ questionId: "a", difficulty: "Hard", previouslyCorrect: true }),
  ]);
  assert.equal(res.deltas.length, 1);
  assert.equal(res.deltas[0].delta, 0);
  assert.equal(res.finalSubjects.Physics.rating, START_RATING);
  assert.equal(res.finalSubjects.Physics.questionsRated, 0); // no match counted
});

test("a previously-WRONG question still counts on a correct retry", () => {
  const res = applyAttempt(baseState(), [
    input({ questionId: "a", difficulty: "Hard", previouslyCorrect: false, correct: true }),
  ]);
  assert.ok(res.deltas[0].delta > 0);
  assert.equal(res.finalSubjects.Physics.questionsRated, 1);
});

test("attempt routes deltas to the right subjects and sums totalDelta", () => {
  const res = applyAttempt(baseState(), [
    input({ questionId: "p", subject: "Physics", correct: true }),
    input({ questionId: "b", subject: "Biology", correct: false, difficulty: "Easy" }),
  ]);
  assert.ok(res.finalSubjects.Physics.rating > START_RATING);
  assert.ok(res.finalSubjects.Biology.rating < START_RATING);
  assert.equal(res.finalSubjects.Chemistry.rating, START_RATING);
  const sum = res.deltas.reduce((s, d) => s + d.delta, 0);
  assert.equal(res.totalDelta, sum);
});

test("overallBefore/After reflect the exam weighting after an attempt", () => {
  const res = applyAttempt(baseState(), [
    input({ questionId: "b", subject: "Biology", difficulty: "Hard", correct: true }),
  ]);
  assert.equal(res.overallBefore, START_RATING);
  assert.ok(res.overallAfter > res.overallBefore);
});

console.log(`\n${passed} checks passed.\n`);
