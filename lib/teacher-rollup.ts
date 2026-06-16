/**
 * Pure aggregation for the teacher class-level diagnosis rollup.
 *
 * Takes a flat list of answers (each enriched with the question and the
 * student who submitted it), runs diagnoseDetailed() on each, and returns a
 * per-chapter map of how many *distinct students* fell into each problem
 * category. SOLID answers are excluded — they are not problems.
 *
 * This is the single source of truth for the "re-teach this week" reason line:
 * "Concept Gap: 9 · Guessing: 4 · Careless: 1".
 *
 * Pure and dependency-free from the DB layer — testable without Supabase.
 */

import { diagnoseDetailed } from "./diagnose";
import type { DiagnosisCategory, Question } from "./types";

export type DiagnosisCounts = Partial<Record<DiagnosisCategory, number>>;

export type AnswerForRollup = {
  attemptId: string;
  studentId: string;
  question: Question;
  pickedIndex: number | null;
  timeSec: number;
  firstPickedIndex: number | null;
};

/**
 * Aggregate diagnosis results by chapter, counting distinct students per
 * problem category (not raw answer counts).
 *
 * One student with 3 CONCEPT_GAP answers in a chapter → counted once in
 * CONCEPT_GAP for that chapter, regardless of attempt count.
 *
 * @returns Record keyed by "subject|chapter". Categories with 0 are omitted.
 */
export function rollupAnswersToDiagnosis(
  answers: AnswerForRollup[],
): Record<string, DiagnosisCounts> {
  // chapterKey -> category -> Set<studentId>
  const studentSets: Record<
    string,
    Partial<Record<DiagnosisCategory, Set<string>>>
  > = {};

  for (const a of answers) {
    const { category } = diagnoseDetailed(
      a.question,
      a.pickedIndex,
      a.timeSec,
      a.firstPickedIndex ?? undefined,
    );
    if (category === "SOLID") continue;

    const key = `${a.question.subject}|${a.question.chapter}`;
    if (!studentSets[key]) studentSets[key] = {};
    if (!studentSets[key][category]) studentSets[key][category] = new Set();
    studentSets[key][category]!.add(a.studentId);
  }

  const result: Record<string, DiagnosisCounts> = {};
  for (const [key, catSets] of Object.entries(studentSets)) {
    result[key] = {};
    for (const [cat, students] of Object.entries(catSets) as [
      DiagnosisCategory,
      Set<string>,
    ][]) {
      if (students.size > 0) result[key][cat] = students.size;
    }
  }
  return result;
}
