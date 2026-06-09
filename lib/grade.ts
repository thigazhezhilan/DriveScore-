/**
 * Grading + report aggregation.
 *
 * Turns the raw (questions + attempts) into everything the three report
 * views need: the NEET score, per-subject breakdown, the grouped diagnosis
 * (the product's centrepiece), and the "what to re-teach" weak-chapter list.
 *
 * Pure functions — no React, no side effects. Depends only on the engine.
 */

import { diagnose } from "./diagnose";
import type {
  Attempt,
  DiagnosisCategory,
  Question,
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
};

/** A group of mistakes sharing one diagnosis category. */
export type DiagnosisGroup = {
  category: DiagnosisCategory;
  items: GradedItem[];
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
  weakChapters: {
    chapter: string;
    subject: Subject;
    category: DiagnosisCategory;
    count: number;
  }[];
  /**
   * The teacher's "what to re-teach" list: CONCEPT_GAP chapters ONLY.
   * Careless / Guess / Too-slow / Time-management are deliberately excluded —
   * there is nothing for a teacher to re-explain about those.
   */
  reTeachChapters: {
    chapter: string;
    subject: Subject;
    category: DiagnosisCategory;
    count: number;
  }[];
  /** Subject the student is strongest in (highest accuracy). */
  strongestSubject: Subject | null;
};

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];

const PROBLEM_ORDER: DiagnosisCategory[] = [
  "CONCEPT_GAP",
  "GUESS",
  "CARELESS",
  "TOO_SLOW",
  "TIME_MANAGEMENT",
];

function marksFor(correct: boolean, attempted: boolean): number {
  if (!attempted) return MARK_BLANK;
  return correct ? MARK_CORRECT : MARK_WRONG;
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
    return {
      question,
      attempt,
      correct,
      attempted,
      marks: marksFor(correct, attempted),
      category: diagnose(question, attempt.pickedIndex, attempt.timeSec),
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
  const groups: DiagnosisGroup[] = PROBLEM_ORDER.map((category) => ({
    category,
    items: items.filter((it) => it.category === category),
  })).filter((g) => g.items.length > 0);

  // Weak chapters: any chapter touched by a problem category.
  const chapterMap = new Map<
    string,
    { chapter: string; subject: Subject; category: DiagnosisCategory; count: number }
  >();
  for (const it of items) {
    if (it.category === "SOLID") continue;
    const key = `${it.question.subject}::${it.question.chapter}`;
    const existing = chapterMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      chapterMap.set(key, {
        chapter: it.question.chapter,
        subject: it.question.subject,
        category: it.category,
        count: 1,
      });
    }
  }
  const weakChapters = [...chapterMap.values()].sort(
    (a, b) => b.count - a.count,
  );

  // "What to re-teach": genuine concept gaps only.
  const reTeachMap = new Map<
    string,
    { chapter: string; subject: Subject; category: DiagnosisCategory; count: number }
  >();
  for (const it of items) {
    if (it.category !== "CONCEPT_GAP") continue;
    const key = `${it.question.subject}::${it.question.chapter}`;
    const existing = reTeachMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      reTeachMap.set(key, {
        chapter: it.question.chapter,
        subject: it.question.subject,
        category: "CONCEPT_GAP",
        count: 1,
      });
    }
  }
  const reTeachChapters = [...reTeachMap.values()].sort(
    (a, b) => b.count - a.count,
  );

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
  };
}

/** Format seconds as "m:ss" for display. */
export function fmtTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
