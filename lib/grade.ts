/**
 * Grading + report aggregation.
 *
 * Turns the raw (questions + attempts) into everything the three report
 * views need: the NEET score, per-subject breakdown, the grouped diagnosis
 * (the product's centrepiece), and the "what to re-teach" weak-chapter list.
 *
 * Pure functions — no React, no side effects. Depends only on the engine.
 */

import { diagnoseDetailed } from "./diagnose";
import type {
  Attempt,
  DiagnosisCategory,
  Question,
  SpeedArchetype,
  Subject,
} from "./types";

/** NEET marking scheme. */
export const MARK_CORRECT = 4;
export const MARK_WRONG = -1;
export const MARK_BLANK = 0;

/** One graded question: the attempt joined with its diagnosis. */
export type GradedItem = {
  question: Question;
  attempt: Attempt;
  correct: boolean;
  attempted: boolean;
  marks: number;
  category: DiagnosisCategory;
  /** 0–100 confidence in the category (see `diagnoseDetailed`). */
  confidence: number;
  /** One-line justification for the confidence. */
  confidenceReason: string;
};

/** A group of mistakes sharing one diagnosis category. */
export type DiagnosisGroup = {
  category: DiagnosisCategory;
  items: GradedItem[];
  /** Mean confidence (0–100, rounded) across the group's items. */
  avgConfidence: number;
};

/** A weak/re-teach chapter, tagged with its dominant category. */
export type WeakChapter = {
  chapter: string;
  subject: Subject;
  category: DiagnosisCategory;
  count: number;
  /** Mean confidence (0–100, rounded) across this chapter's problem items. */
  avgConfidence: number;
};

/** One row of the "where your marks went" ranking. */
export type RootCause = {
  category: DiagnosisCategory;
  /** Total marks lost to this category (opportunity cost vs. a correct answer). */
  marksLost: number;
};

/** Whole-attempt pacing personality + a plain-language explanation. */
export type Archetype = {
  type: SpeedArchetype;
  label: string;
  description: string;
};

export type SubjectBreakdown = {
  subject: Subject;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  marks: number;
  maxMarks: number;
};

export type Report = {
  items: GradedItem[];
  /** Net NEET score (can be negative in theory). */
  score: number;
  maxScore: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  accuracyPct: number;
  totalTimeSec: number;
  bySubject: SubjectBreakdown[];
  /** Problem groups only, in stable order, empty groups omitted. */
  groups: DiagnosisGroup[];
  /** Distinct weak chapters tagged with their dominant category. */
  weakChapters: WeakChapter[];
  /**
   * The teacher's "what to re-teach" list: CONCEPT_GAP chapters ONLY.
   * Careless / Guess / Self-doubt / Too-slow / Time-management are deliberately
   * excluded — there is nothing for a teacher to re-explain about those.
   */
  reTeachChapters: WeakChapter[];
  /** Subject the student is strongest in (highest accuracy). */
  strongestSubject: Subject | null;
  /**
   * Marks lost per category, highest impact first. Leads the report with WHERE
   * the marks went, not raw category counts. Correct-but-slow loses nothing, so
   * TOO_SLOW / SOLID never appear here.
   */
  rootCauses: RootCause[];
  /** Whole-attempt pacing personality, or null when there's too little data. */
  archetype: Archetype | null;
};

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];

const PROBLEM_ORDER: DiagnosisCategory[] = [
  "CONCEPT_GAP",
  "SELF_DOUBT",
  "GUESS",
  "CARELESS",
  "TOO_SLOW",
  "TIME_MANAGEMENT",
];

function marksFor(correct: boolean, attempted: boolean): number {
  if (!attempted) return MARK_BLANK;
  return correct ? MARK_CORRECT : MARK_WRONG;
}

/** Rounded mean confidence over a set of graded items (0 when empty). */
function meanConfidence(items: GradedItem[]): number {
  if (items.length === 0) return 0;
  return Math.round(
    items.reduce((s, it) => s + it.confidence, 0) / items.length,
  );
}

// ── Speed archetypes ─────────────────────────────────────────────────────────

/** Need at least this many attempted questions to call an archetype at all. */
export const ARCHETYPE_MIN_QUESTIONS = 5;
/** Mean pace (time / par) above this is "slow"; below FAST_PACE is "fast". */
export const SLOW_PACE = 1.15;
export const FAST_PACE = 0.8;
/** Accuracy bands (fraction 0–1) for sniper (high) and gambler (low). */
export const HIGH_ACCURACY = 0.7;
export const LOW_ACCURACY = 0.5;
/** Accuracy drop (fraction) in the final fifth that flags a PANICKER. */
export const PANIC_DROP = 0.3;

const ARCHETYPE_COPY: Record<SpeedArchetype, { label: string; description: string }> = {
  SNIPER: {
    label: "Sniper",
    description:
      "Accurate but deliberate — you take the time to get it right. Build speed so you finish with room to spare.",
  },
  GAMBLER: {
    label: "Gambler",
    description:
      "Fast but loose — you're moving quickly and missing marks. Slow down and eliminate options before committing.",
  },
  PANICKER: {
    label: "Panicker",
    description:
      "You started strong but accuracy dropped sharply near the end — a sign of time pressure. Practise pacing the full paper.",
  },
  BALANCED: {
    label: "Balanced",
    description:
      "Your speed and accuracy are well matched. Keep building on both.",
  },
};

/**
 * Classify the whole attempt into one pacing archetype from timing +
 * correctness we already store. Pure + deterministic. Returns null when there
 * aren't enough attempted questions to say anything meaningful (so a no-data
 * report renders without an archetype rather than guessing).
 *
 * @param items graded items in TEST ORDER (the order they were answered)
 */
export function classifyArchetype(items: GradedItem[]): Archetype | null {
  const attempted = items.filter((it) => it.attempted);
  if (attempted.length < ARCHETYPE_MIN_QUESTIONS) return null;

  const correctCount = attempted.filter((it) => it.correct).length;
  const accuracy = correctCount / attempted.length;

  // Mean pace relative to par (questions with no par time are skipped).
  const paced = attempted.filter((it) => it.question.parTimeSec > 0);
  const paceRatio =
    paced.length > 0
      ? paced.reduce((s, it) => s + it.attempt.timeSec / it.question.parTimeSec, 0) /
        paced.length
      : 1;

  const decide = (): SpeedArchetype => {
    // PANICKER first: a sharp accuracy fall in the final ~20% by test order.
    const splitIndex = Math.floor(attempted.length * 0.8);
    const head = attempted.slice(0, splitIndex);
    const tail = attempted.slice(splitIndex);
    if (head.length >= 2 && tail.length >= 2) {
      const headAcc = head.filter((it) => it.correct).length / head.length;
      const tailAcc = tail.filter((it) => it.correct).length / tail.length;
      if (tailAcc <= headAcc - PANIC_DROP) return "PANICKER";
    }
    if (accuracy >= HIGH_ACCURACY && paceRatio > SLOW_PACE) return "SNIPER";
    if (accuracy < LOW_ACCURACY && paceRatio < FAST_PACE) return "GAMBLER";
    return "BALANCED";
  };

  const type = decide();
  return { type, ...ARCHETYPE_COPY[type] };
}

/**
 * Grade a full session.
 *
 * @param questions the questions that were served (order = test order)
 * @param attempts  attempts keyed loosely; matched by questionId
 */
export function buildReport(
  questions: Question[],
  attempts: Attempt[],
): Report {
  const attemptByQ = new Map(attempts.map((a) => [a.questionId, a]));

  const items: GradedItem[] = questions.map((question) => {
    const attempt: Attempt =
      attemptByQ.get(question.id) ?? {
        questionId: question.id,
        pickedIndex: null,
        timeSec: 0,
      };
    const attempted = attempt.pickedIndex !== null;
    const correct = attempt.pickedIndex === question.answerIndex;
    const dx = diagnoseDetailed(
      question,
      attempt.pickedIndex,
      attempt.timeSec,
      attempt.firstPickedIndex,
    );
    return {
      question,
      attempt,
      correct,
      attempted,
      marks: marksFor(correct, attempted),
      category: dx.category,
      confidence: dx.confidence,
      confidenceReason: dx.confidenceReason,
    };
  });

  const score = items.reduce((sum, it) => sum + it.marks, 0);
  const maxScore = questions.length * MARK_CORRECT;
  const correctCount = items.filter((it) => it.correct && it.attempted).length;
  const wrongCount = items.filter((it) => !it.correct && it.attempted).length;
  const blankCount = items.filter((it) => !it.attempted).length;
  const attemptedCount = correctCount + wrongCount;
  const totalTimeSec = items.reduce((s, it) => s + it.attempt.timeSec, 0);

  // Per-subject breakdown.
  const bySubject: SubjectBreakdown[] = SUBJECTS.map((subject) => {
    const subjItems = items.filter((it) => it.question.subject === subject);
    const correct = subjItems.filter((it) => it.correct && it.attempted).length;
    const wrong = subjItems.filter((it) => !it.correct && it.attempted).length;
    const blank = subjItems.filter((it) => !it.attempted).length;
    return {
      subject,
      total: subjItems.length,
      correct,
      wrong,
      blank,
      marks: subjItems.reduce((s, it) => s + it.marks, 0),
      maxMarks: subjItems.length * MARK_CORRECT,
    };
  }).filter((b) => b.total > 0);

  // Grouped diagnosis — problem buckets only, empty ones dropped.
  const groups: DiagnosisGroup[] = PROBLEM_ORDER.map((category) => {
    const groupItems = items.filter((it) => it.category === category);
    return { category, items: groupItems, avgConfidence: meanConfidence(groupItems) };
  }).filter((g) => g.items.length > 0);

  // Chapter aggregation helper: collect the problem items per chapter so we can
  // build both the weak-chapter list and the re-teach list with mean confidence.
  function aggregateChapters(predicate: (it: GradedItem) => boolean): WeakChapter[] {
    const map = new Map<string, GradedItem[]>();
    for (const it of items) {
      if (!predicate(it)) continue;
      const key = `${it.question.subject}::${it.question.chapter}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(it);
      else map.set(key, [it]);
    }
    return [...map.values()]
      .map((bucket) => ({
        chapter: bucket[0].question.chapter,
        subject: bucket[0].question.subject,
        // The chapter's first problem item drives its dominant category tag,
        // preserving the prior behaviour (first-seen wins).
        category: bucket[0].category,
        count: bucket.length,
        avgConfidence: meanConfidence(bucket),
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Weak chapters: any chapter touched by a problem category.
  const weakChapters = aggregateChapters((it) => it.category !== "SOLID");

  // "What to re-teach": genuine concept gaps only.
  const reTeachChapters = aggregateChapters((it) => it.category === "CONCEPT_GAP");

  // Root-cause ranking: marks lost per category (opportunity cost vs. correct),
  // highest impact first. Wrong = 5 lost, blank = 4 lost, correct = 0.
  const lostByCategory = new Map<DiagnosisCategory, number>();
  for (const it of items) {
    const lost = MARK_CORRECT - it.marks;
    if (lost <= 0) continue;
    lostByCategory.set(it.category, (lostByCategory.get(it.category) ?? 0) + lost);
  }
  const rootCauses: RootCause[] = [...lostByCategory.entries()]
    .map(([category, marksLost]) => ({ category, marksLost }))
    .sort(
      (a, b) =>
        b.marksLost - a.marksLost ||
        PROBLEM_ORDER.indexOf(a.category) - PROBLEM_ORDER.indexOf(b.category),
    );

  const archetype = classifyArchetype(items);

  // Strongest subject by accuracy (ties broken by marks).
  let strongestSubject: Subject | null = null;
  let bestAccuracy = -1;
  for (const b of bySubject) {
    const attempted = b.correct + b.wrong;
    const acc = attempted > 0 ? b.correct / attempted : 0;
    if (acc > bestAccuracy) {
      bestAccuracy = acc;
      strongestSubject = b.subject;
    }
  }

  return {
    items,
    score,
    maxScore,
    totalQuestions: questions.length,
    correctCount,
    wrongCount,
    blankCount,
    accuracyPct:
      attemptedCount > 0
        ? Math.round((correctCount / attemptedCount) * 100)
        : 0,
    totalTimeSec,
    bySubject,
    groups,
    weakChapters,
    reTeachChapters,
    strongestSubject,
    rootCauses,
    archetype,
  };
}

/** Format seconds as "m:ss" for display. */
export function fmtTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
