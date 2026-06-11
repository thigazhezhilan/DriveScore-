"use server";

/**
 * Server actions for the test flow. These run only on the server, so they can
 * safely touch the database (service key never reaches the client).
 */

import {
  createAttempt,
  countSubmittedAttempts,
  getMockMaxAttempts,
  getMockWithQuestions,
  saveAttempt,
} from "@/lib/db/queries";
import { getVisibleMock } from "@/lib/db/mocks";
import { applyRatingUpdates } from "@/lib/db/ratings";
import { getCurrentStudent } from "@/lib/auth";
import { buildReport } from "@/lib/grade";
import type { Attempt } from "@/lib/types";

/**
 * Grade + persist a finished mock for the LOGGED-IN student.
 *
 * The student id is derived from the session on the server (never trusted from
 * the client), so an attempt is always written under the right `student_id`.
 * Re-fetches the authoritative questions and grades with the pure `buildReport`
 * so the score can't be tampered with, then writes the attempt + answer rows.
 */
export async function submitAttempt(
  mockId: string,
  answers: Attempt[],
): Promise<{ attemptId: string }> {
  const student = await getCurrentStudent();
  if (!student) {
    throw new Error("No student account is linked to your login.");
  }

  // Re-check access server-side: RLS only returns this mock if it's published
  // for the student's own batch. Don't grade/persist an unassigned mock.
  const allowed = await getVisibleMock(mockId);
  if (!allowed) {
    throw new Error("This mock isn't available to you.");
  }

  // Enforce attempt limit — compare how many the student has already submitted
  // against the teacher-configured max_attempts for this mock.
  const [existingCount, maxAttempts] = await Promise.all([
    countSubmittedAttempts(mockId, student.id),
    getMockMaxAttempts(mockId),
  ]);
  if (existingCount >= maxAttempts) {
    throw new Error(
      maxAttempts === 1
        ? "You have already submitted this mock. Your teacher can unlock a retake from their dashboard."
        : `You have reached the maximum of ${maxAttempts} attempts for this mock.`,
    );
  }

  const { questions } = await getMockWithQuestions(mockId);
  const report = buildReport(questions, answers);

  const attemptId = await createAttempt(mockId, student.id);
  await saveAttempt(attemptId, answers, {
    totalMarks: report.score,
    maxMarks: report.maxScore,
    accuracy: report.accuracyPct,
  });

  // Update the student's skill ratings from this attempt. Best-effort: grading
  // and the report are the sacred path, so a rating failure must never fail the
  // submission — log and carry on.
  try {
    await applyRatingUpdates(attemptId, student.id, report.items);
  } catch (err) {
    console.error("Rating update failed for attempt", attemptId, err);
  }

  return { attemptId };
}
