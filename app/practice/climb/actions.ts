"use server";

/**
 * "Climb the Lesson" server actions — serve one question at a time (no answer
 * key) and grade one answer at a time. Both verify a logged-in student.
 */

import { getCurrentStudent, getCurrentUser } from "@/lib/auth";
import {
  sampleClimbQuestion,
  getQuestionAnswerIndex,
  createMockFromQuestionIds,
  reportQuestion,
  type ClimbQuestion,
} from "@/lib/db/practice";
import { getMockWithQuestions, createAttempt, saveAttempt } from "@/lib/db/queries";
import { applyRatingUpdates } from "@/lib/db/ratings";
import { buildReport } from "@/lib/grade";
import { SUBJECTS } from "@/lib/questions/validate";
import type { Attempt, Difficulty, Subject } from "@/lib/types";

const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

/** Next question for the run, matched to a difficulty rung, excluding seen ids. */
export async function nextClimbQuestion(
  subjectIn: string,
  chapter: string,
  rung: number,
  seenIds: string[],
  source: "pyq" | "ai" = "pyq",
  locale: "en" | "ta" = "en",
): Promise<ClimbQuestion | null> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "student") return null;
  const subject = SUBJECTS.find((s) => s === subjectIn) as Subject | undefined;
  if (!subject || !chapter) return null;
  const difficulty = DIFFS[Math.max(0, Math.min(2, rung))] ?? "Easy";
  return sampleClimbQuestion(subject, chapter, difficulty, seenIds.slice(0, 500), source, locale);
}

/** Student flags a question as wrong (crowd QA for AI questions). */
export async function reportClimbQuestion(questionId: string): Promise<{ ok: boolean }> {
  const student = await getCurrentStudent();
  if (!student) return { ok: false };
  await reportQuestion(questionId, student.id);
  return { ok: true };
}

/** Grade one answer; returns whether it was correct + the correct index. */
export async function gradeClimbAnswer(
  questionId: string,
  pickedIndex: number,
): Promise<{ correct: boolean; correctIndex: number }> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "student") return { correct: false, correctIndex: -1 };
  const answer = await getQuestionAnswerIndex(questionId);
  if (answer === null) return { correct: false, correctIndex: -1 };
  return { correct: pickedIndex === answer, correctIndex: answer };
}

/**
 * Finish a run: persist the answered questions as a gradeable attempt and return
 * its id, so the client can open the full diagnosis report (/report?attempt=…).
 */
export async function finishClimbRun(
  chapter: string,
  answers: Attempt[],
): Promise<{ attemptId: string } | { error: string }> {
  if (!answers || answers.length === 0) return { error: "Nothing answered." };

  try {
    const student = await getCurrentStudent();
    if (!student) return { error: "No student account." };

    let mockId: string;
    try {
      mockId = await createMockFromQuestionIds(
        student.id,
        `${chapter} — practice`,
        answers.map((a) => a.questionId),
      );
    } catch (e) {
      return { error: `[create-mock] ${(e as Error).message}` };
    }

    let questions: Awaited<ReturnType<typeof getMockWithQuestions>>["questions"];
    try {
      ({ questions } = await getMockWithQuestions(mockId));
    } catch (e) {
      return { error: `[load-mock] ${(e as Error).message}` };
    }

    const report = buildReport(questions, answers);

    let attemptId: string;
    try {
      attemptId = await createAttempt(mockId, student.id);
    } catch (e) {
      return { error: `[create-attempt] ${(e as Error).message}` };
    }

    try {
      await saveAttempt(attemptId, answers, {
        totalMarks: report.score,
        maxMarks: report.maxScore,
        accuracy: report.accuracyPct,
      });
    } catch (e) {
      return { error: `[save-attempt] ${(e as Error).message}` };
    }

    // Update skill ratings from this run. Best-effort: a rating failure must
    // never fail the run or block the report.
    try {
      await applyRatingUpdates(attemptId, student.id, report.items);
    } catch (err) {
      console.error("Rating update failed for climb attempt", attemptId, err);
    }

    return { attemptId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
