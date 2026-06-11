import "server-only";

/**
 * Skill-rating data-access layer.
 *
 * The pure Elo math lives in `lib/rating.ts`; this module is the bridge to
 * Postgres. Two entry points:
 *
 *   applyRatingUpdates() — the WRITE path, called from the grading pipeline
 *     after an attempt is saved. Loads current ratings, resolves the
 *     anti-farming "already aced this before" flags, runs the pure engine,
 *     then upserts the new per-subject + Overall ratings and appends the
 *     `rating_events` ledger. Idempotent: a resubmit can't double-apply
 *     (unique attempt_id+question_id on the ledger).
 *
 *   getRatingSummary() — the READ path for the student home (RLS-scoped).
 *
 * All writes use the service client (privileged). Reads use the user-scoped
 * client so RLS decides visibility, consistent with `db/queries.ts`.
 */

import { getServiceClient } from "./client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  applyAttempt,
  levelFor,
  overallRating,
  START_RATING,
  type RatingInput,
  type SubjectState,
} from "@/lib/rating";
import type { GradedItem } from "@/lib/grade";
import type { Subject } from "@/lib/types";

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];

/** Fresh per-subject state with every subject defaulted to the start rating. */
function emptyState(): Record<Subject, SubjectState> {
  return {
    Physics: { rating: START_RATING, questionsRated: 0 },
    Chemistry: { rating: START_RATING, questionsRated: 0 },
    Biology: { rating: START_RATING, questionsRated: 0 },
  };
}

/**
 * Apply one graded attempt to the student's skill ratings.
 *
 * Best-effort by contract: the caller (submitAttempt) must NOT let a failure
 * here fail the submission — grading + the report are the sacred path. We throw
 * on real DB errors so the caller can log them, but the attempt is already
 * persisted by then.
 */
export async function applyRatingUpdates(
  attemptId: string,
  studentId: string,
  items: GradedItem[],
): Promise<void> {
  const supabase = getServiceClient();

  // 1. Current ratings (default any missing subject to START).
  const current = emptyState();
  const prevLevel: Partial<Record<Subject | "Overall", string>> = {};
  const { data: ratingRows, error: rErr } = await supabase
    .from("student_ratings")
    .select("subject, rating, level, questions_rated")
    .eq("student_id", studentId);
  if (rErr) throw rErr;
  for (const row of ratingRows ?? []) {
    const subj = row.subject as Subject | "Overall";
    prevLevel[subj] = row.level as string;
    if (subj !== "Overall") {
      current[subj] = {
        rating: Number(row.rating),
        questionsRated: row.questions_rated as number,
      };
    }
  }

  // 2. Anti-farming: which of these questions has the student aced before?
  //    (Excludes the current attempt, whose answers are already written.)
  const qIds = items.map((it) => it.question.id);
  const answerIndexById = new Map(
    items.map((it) => [it.question.id, it.question.answerIndex]),
  );
  const previouslyCorrect = new Set<string>();

  const { data: priorAttempts, error: paErr } = await supabase
    .from("attempts")
    .select("id")
    .eq("student_id", studentId)
    .neq("id", attemptId);
  if (paErr) throw paErr;
  const priorAttemptIds = (priorAttempts ?? []).map((a) => a.id as string);

  if (priorAttemptIds.length > 0 && qIds.length > 0) {
    const { data: priorAnswers, error: paaErr } = await supabase
      .from("answers")
      .select("question_id, picked_index")
      .in("attempt_id", priorAttemptIds)
      .in("question_id", qIds);
    if (paaErr) throw paaErr;
    for (const a of priorAnswers ?? []) {
      const qid = a.question_id as string;
      if (a.picked_index === answerIndexById.get(qid)) previouslyCorrect.add(qid);
    }
  }

  // 3. Run the pure engine.
  const inputs: RatingInput[] = items.map((it) => ({
    questionId: it.question.id,
    subject: it.question.subject,
    difficulty: it.question.difficulty,
    attempted: it.attempted,
    correct: it.correct,
    previouslyCorrect: previouslyCorrect.has(it.question.id),
  }));
  const result = applyAttempt(current, inputs);

  // Nothing was rated (e.g. all blank or all already-aced) → leave state alone,
  // but still record the (zero-delta) events so the ledger is complete.
  // 4a. Upsert per-subject + Overall ratings.
  const now = new Date().toISOString();
  const ratingUpserts = SUBJECTS.map((s) => ({
    student_id: studentId,
    subject: s,
    rating: result.finalSubjects[s].rating,
    questions_rated: result.finalSubjects[s].questionsRated,
    level: levelFor(result.finalSubjects[s].rating, prevLevel[s] ?? null).name,
    updated_at: now,
  }));
  const overall = overallRating({
    Physics: result.finalSubjects.Physics.rating,
    Chemistry: result.finalSubjects.Chemistry.rating,
    Biology: result.finalSubjects.Biology.rating,
  });
  ratingUpserts.push({
    student_id: studentId,
    subject: "Overall" as Subject,
    rating: overall,
    questions_rated: SUBJECTS.reduce(
      (sum, s) => sum + result.finalSubjects[s].questionsRated,
      0,
    ),
    level: levelFor(overall, prevLevel.Overall ?? null).name,
    updated_at: now,
  });

  const { error: upErr } = await supabase
    .from("student_ratings")
    .upsert(ratingUpserts, { onConflict: "student_id,subject" });
  if (upErr) throw upErr;

  // 4b. Append the ledger (idempotent on attempt_id+question_id).
  if (result.deltas.length > 0) {
    const events = result.deltas.map((d) => ({
      attempt_id: attemptId,
      question_id: d.questionId,
      student_id: studentId,
      subject: d.subject,
      delta: d.delta,
      rating_after: d.ratingAfter,
    }));
    const { error: evErr } = await supabase
      .from("rating_events")
      .upsert(events, { onConflict: "attempt_id,question_id", ignoreDuplicates: true });
    if (evErr) throw evErr;
  }
}

// ─────────────────────────────── Reads ──────────────────────────────────────

export type SubjectRating = {
  subject: Subject;
  rating: number;
  level: string;
};

export type RatingSummary = {
  overall: { rating: number; level: string };
  subjects: SubjectRating[];
  /** Net rating change from the student's most recent attempt (0 if none). */
  recentDelta: number;
};

/**
 * The student's current ratings for the home screen (RLS-scoped). Returns null
 * if the student hasn't been rated yet (no attempts) — the UI shows nothing.
 */
export async function getRatingSummary(
  studentId: string,
): Promise<RatingSummary | null> {
  const supabase = createSupabaseServerClient(); // RLS: student reads own rows

  const { data: rows, error } = await supabase
    .from("student_ratings")
    .select("subject, rating, level")
    .eq("student_id", studentId);
  if (error) throw error;
  if (!rows || rows.length === 0) return null;

  const bySubject = new Map(rows.map((r) => [r.subject as string, r]));
  const overallRow = bySubject.get("Overall");
  const overall = {
    rating: Math.round(Number(overallRow?.rating ?? START_RATING)),
    level: (overallRow?.level as string) ?? "Aspirant",
  };

  const subjects: SubjectRating[] = SUBJECTS.filter((s) => bySubject.has(s)).map(
    (s) => {
      const r = bySubject.get(s)!;
      return {
        subject: s,
        rating: Math.round(Number(r.rating)),
        level: r.level as string,
      };
    },
  );

  // Net change from the most recent attempt (for the "+24" badge).
  let recentDelta = 0;
  const { data: latest } = await supabase
    .from("attempts")
    .select("id")
    .eq("student_id", studentId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1);
  const latestId = latest?.[0]?.id as string | undefined;
  if (latestId) {
    const { data: events } = await supabase
      .from("rating_events")
      .select("delta")
      .eq("attempt_id", latestId);
    recentDelta = (events ?? []).reduce((s, e) => s + Number(e.delta), 0);
  }

  return { overall, subjects, recentDelta };
}
