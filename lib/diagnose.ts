/**
 * The Diagnosis Engine — the core differentiator of DriveScore.
 *
 * Pure, deterministic logic over (score + per-question time). No AI/LLM.
 * This module is intentionally dependency-free and isolated so it stays
 * unit-testable (see `diagnose.test.ts`).
 *
 * Classification order matters — the FIRST matching rule wins:
 *
 *   1. unattempted                       -> TIME_MANAGEMENT
 *   2. correct && slow                   -> TOO_SLOW
 *   3. correct                           -> SOLID
 *   --- from here the answer is WRONG ---
 *   4. Easy difficulty                   -> CARELESS   (slip on an easy one)
 *   5. Medium/Hard && rushed             -> GUESS      (barely engaged = a guess)
 *   6. otherwise (Medium/Hard, worked it)-> CONCEPT_GAP (a real gap)
 */

import type { DiagnosisCategory, DiagnosisResult, Question } from "./types";

/** A question is "slow" when time spent exceeds 140% of par. */
export const SLOW_FACTOR = 1.4;

/** A wrong answer answered in under 40% of par counts as "rushed" (a guess). */
export const RUSH_FACTOR = 0.4;

/**
 * Classify a single attempt into exactly one diagnosis category.
 *
 * @param q           the question that was (or wasn't) answered
 * @param pickedIndex the chosen option index, or null if left blank
 * @param timeSec     seconds spent on the question
 */
export function diagnose(
  q: Question,
  pickedIndex: number | null,
  timeSec: number,
): DiagnosisCategory {
  // 1. Left blank / ran out of time.
  if (pickedIndex === null) {
    return "TIME_MANAGEMENT";
  }

  const correct = pickedIndex === q.answerIndex;
  const slow = timeSec > q.parTimeSec * SLOW_FACTOR;
  const rushed = timeSec < q.parTimeSec * RUSH_FACTOR;

  // 2. Knows it, but not fluent.
  if (correct && slow) {
    return "TOO_SLOW";
  }

  // 3. Correct and on-pace — not a problem.
  if (correct) {
    return "SOLID";
  }

  // --- The answer is WRONG from here on. ---

  // 4. An easy question should have been known — getting it wrong is a slip.
  if (q.difficulty === "Easy") {
    return "CARELESS";
  }

  // 5. Wrong on Medium/Hard, answered too fast to have worked it out: a guess.
  if (rushed) {
    return "GUESS";
  }

  // 6. Wrong on Medium/Hard at a real working pace: a genuine knowledge gap.
  return "CONCEPT_GAP";
}

// ───────────────────────── Confidence (v2) ──────────────────────────────────
//
// `diagnose()` above is the unchanged, fully-tested category classifier. The
// detailed variant below WRAPS it: it reuses the exact same category decision,
// then (a) upgrades a wrong answer to SELF_DOUBT when first-answer data shows
// the student had it right and changed it, and (b) attaches a 0–100 confidence
// that reflects how far the signal sits from the boundary with the runner-up
// category. Confidence uses ONLY within-attempt signals (timing vs. par,
// difficulty, first-vs-final answer) — no cross-attempt/cross-student data,
// per the no-data-tier guardrails.

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));

/**
 * Classify a single attempt AND score how confident that classification is.
 *
 * Backwards-compatible by construction: when `firstPickedIndex` is omitted or
 * null, the category is exactly what `diagnose()` returns. SELF_DOUBT only ever
 * appears when first-answer data is present.
 *
 * @param firstPickedIndex the first option the student touched, or null/undefined
 */
export function diagnoseDetailed(
  q: Question,
  pickedIndex: number | null,
  timeSec: number,
  firstPickedIndex?: number | null,
): DiagnosisResult {
  const base = diagnose(q, pickedIndex, timeSec);

  // SELF_DOUBT: only on a WRONG final answer, and only when first-answer data
  // exists and shows the first touch was correct. Blanks (TIME_MANAGEMENT) and
  // correct answers are never overridden.
  const wrongFinal = pickedIndex !== null && pickedIndex !== q.answerIndex;
  const hadItFirst =
    firstPickedIndex !== null &&
    firstPickedIndex !== undefined &&
    firstPickedIndex === q.answerIndex;
  if (wrongFinal && hadItFirst) {
    return {
      category: "SELF_DOUBT",
      confidence: 95,
      confidenceReason:
        "You selected the correct option first, then changed it to a wrong one.",
    };
  }

  const slowThreshold = q.parTimeSec * SLOW_FACTOR;
  const rushThreshold = q.parTimeSec * RUSH_FACTOR;

  switch (base) {
    case "TIME_MANAGEMENT":
      // A blank is a directly observed fact — high confidence in the category.
      return {
        category: base,
        confidence: 90,
        confidenceReason: "No answer was recorded for this question.",
      };

    case "SOLID": {
      // Boundary is TOO_SLOW at the slow threshold. The more time to spare, the
      // clearer it's a clean solve.
      const margin =
        slowThreshold > 0 ? (slowThreshold - timeSec) / slowThreshold : 1;
      return {
        category: base,
        confidence: clamp(Math.round(55 + margin * 44), 55, 99),
        confidenceReason: "Correct and comfortably within the time budget.",
      };
    }

    case "TOO_SLOW": {
      // Boundary is SOLID at the slow threshold. Just over par → borderline;
      // far over par → unmistakably slow.
      const over =
        slowThreshold > 0 ? (timeSec - slowThreshold) / slowThreshold : 0;
      return {
        category: base,
        confidence: clamp(Math.round(50 + over * 100), 50, 95),
        confidenceReason: "Correct, but well over the expected time.",
      };
    }

    case "CARELESS": {
      // Forced by Easy + wrong. A fast slip reads as careless; a slow miss on an
      // easy question is more ambiguous (could be a real gap), so lower it.
      const ratio = q.parTimeSec > 0 ? timeSec / q.parTimeSec : 0;
      return {
        category: base,
        confidence: clamp(Math.round(90 - ratio * 40), 45, 90),
        confidenceReason: "Wrong on an easy question — usually a slip.",
      };
    }

    case "GUESS": {
      // Boundary is CONCEPT_GAP at the rush threshold. The faster below it, the
      // more clearly it was a guess rather than worked-out.
      const margin =
        rushThreshold > 0 ? (rushThreshold - timeSec) / rushThreshold : 0;
      return {
        category: base,
        confidence: clamp(Math.round(55 + margin * 40), 55, 97),
        confidenceReason: "Wrong and answered too fast to have worked it out.",
      };
    }

    case "CONCEPT_GAP":
    default: {
      // Boundary is GUESS at the rush threshold (below). More working time, and
      // a Hard question, both strengthen "genuine gap".
      const over =
        rushThreshold > 0 ? (timeSec - rushThreshold) / rushThreshold : 1;
      const hardBonus = q.difficulty === "Hard" ? 15 : 0;
      return {
        category: "CONCEPT_GAP",
        confidence: clamp(
          Math.round(50 + Math.min(over, 1) * 30 + hardBonus),
          50,
          95,
        ),
        confidenceReason: "Wrong after genuinely working on it.",
      };
    }
  }
}

/** Display metadata for each category. Drives the report UI. */
export const CATEGORY_META: Record<
  DiagnosisCategory,
  {
    title: string;
    advice: string;
    /** Tailwind colour token (see tailwind.config.ts). */
    color: string;
    /** True for buckets that represent a problem worth showing. */
    isProblem: boolean;
  }
> = {
  CONCEPT_GAP: {
    title: "Concept Gaps",
    advice: "Re-learn from the NCERT chapter before practising more.",
    color: "gap",
    isProblem: true,
  },
  GUESS: {
    title: "Guessing",
    advice:
      "Answered too fast without really working it out. On hard questions, slow down and use elimination instead of guessing.",
    color: "guess",
    isProblem: true,
  },
  SELF_DOUBT: {
    title: "Self-Doubt",
    advice:
      "You had these right, then talked yourself out of them. Trust your first instinct — only change an answer when you have a concrete reason.",
    color: "guess",
    isProblem: true,
  },
  CARELESS: {
    title: "Careless Slips",
    advice: "You knew these but slipped — slow down on easy questions.",
    color: "careless",
    isProblem: true,
  },
  TOO_SLOW: {
    title: "Too Slow",
    advice: "Correct, but too slow — practise these for speed.",
    color: "slow",
    isProblem: true,
  },
  TIME_MANAGEMENT: {
    title: "Time Management",
    advice: "Left blank — work on pacing across the full paper.",
    color: "time",
    isProblem: true,
  },
  SOLID: {
    title: "Solid",
    advice: "Correct and on time — keep it up.",
    color: "solid",
    isProblem: false,
  },
};

/** Stable display order for the problem categories. */
export const PROBLEM_ORDER: DiagnosisCategory[] = [
  "CONCEPT_GAP",
  "SELF_DOUBT",
  "GUESS",
  "CARELESS",
  "TOO_SLOW",
  "TIME_MANAGEMENT",
];
