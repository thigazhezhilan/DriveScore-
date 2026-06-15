import "server-only";

/**
 * Mastery Road data layer.
 *
 * The pure progression logic lives in `lib/mastery.ts`; this module is the
 * bridge to Postgres. Mastery is DERIVED, not stored — it's recomputed fresh
 * from the raw answer history (the same source of truth the diagnosis engine
 * uses), so it can never drift from reality and needs no migration.
 *
 * Reads use the SERVICE client because mastery needs the answer key to score
 * each answer (correct vs. wrong) — exactly like the grading path. No answer
 * keys or `answer_index` are ever returned to the caller; only computed gate
 * states leave this module. The caller passes the authenticated student's own
 * id (resolved via the session), so this stays scoped to "me".
 */

import { getServiceClient } from "./client";
import { countGateQuestions } from "./practice";
import {
  computeRoad,
  GATE_CONFIG,
  PRESCRIPTION_SIZE,
  type ChapterAnswers,
  type Gate,
  type MasteryAnswer,
  type Road,
} from "@/lib/mastery";
import type { Difficulty, Subject } from "@/lib/types";

/** The frontier turned into an actionable study prescription. */
export type Prescription = {
  subject: Subject;
  chapter: string;
  gate: Gate;
  gateLabel: string;
  /** Difficulties the recommended set is drawn from. */
  difficulties: Difficulty[];
  /** How many questions the quest will serve (capped at PRESCRIPTION_SIZE). */
  recommendedCount: number;
  /** One-line, next-step reason (never a global percentage). */
  reason: string;
};

export type RoadData = {
  road: Road;
  prescription: Prescription | null;
};

/** Row shape for the embedded question on an answer. */
type AnswerRow = {
  attempt_id: string;
  picked_index: number | null;
  questions: {
    subject: string;
    chapter: string;
    difficulty: string;
    answer_index: number;
  } | null;
};

function* chunk<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

/**
 * Build the student's Mastery Road from their raw attempts + answers, then turn
 * the frontier into a study prescription scoped to the global question bank.
 */
export async function getStudentRoad(studentId: string): Promise<RoadData> {
  const supabase = getServiceClient();

  // Submitted attempts → session id + timestamp (for the 2-session + decay rules).
  const { data: attemptRows, error: aErr } = await supabase
    .from("attempts")
    .select("id, submitted_at")
    .eq("student_id", studentId)
    .not("submitted_at", "is", null);
  if (aErr) throw aErr;

  const submittedAt = new Map<string, number>(
    (attemptRows ?? []).map((a) => [
      a.id as string,
      new Date(a.submitted_at as string).getTime(),
    ]),
  );
  const attemptIds = [...submittedAt.keys()];
  if (attemptIds.length === 0) {
    return { road: computeRoad([]), prescription: null };
  }

  // Answers joined to their question (subject/chapter/difficulty + answer key).
  // Paginated past Supabase's 1000-row cap and chunked over attempt ids.
  const byChapter = new Map<string, ChapterAnswers>();
  for (const ids of chunk(attemptIds, 100)) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("answers")
        .select("attempt_id, picked_index, questions(subject, chapter, difficulty, answer_index)")
        .in("attempt_id", ids)
        .range(from, from + 999);
      if (error) throw error;

      const rows = (data ?? []) as unknown as AnswerRow[];
      for (const row of rows) {
        const q = row.questions;
        if (!q) continue;
        // Blanks demonstrate nothing — exclude from mastery entirely (they
        // neither prove skill nor should they tank tier accuracy).
        if (row.picked_index === null || row.picked_index === undefined) continue;

        const subject = q.subject as Subject;
        const key = `${subject}::${q.chapter}`;
        let entry = byChapter.get(key);
        if (!entry) {
          entry = { subject, chapter: q.chapter, answers: [] };
          byChapter.set(key, entry);
        }
        const answer: MasteryAnswer = {
          difficulty: q.difficulty as Difficulty,
          correct: row.picked_index === q.answer_index,
          sessionId: row.attempt_id,
          at: submittedAt.get(row.attempt_id) ?? 0,
        };
        entry.answers.push(answer);
      }
      if (!data || data.length < 1000) break;
    }
  }

  const road = computeRoad([...byChapter.values()]);

  // Turn the frontier into a prescription, sized to what the bank can supply.
  let prescription: Prescription | null = null;
  if (road.frontier) {
    const f = road.frontier;
    const difficulties = GATE_CONFIG[f.gate].difficulties;
    const available = await countGateQuestions(f.subject, f.chapter, difficulties);
    prescription = {
      subject: f.subject,
      chapter: f.chapter,
      gate: f.gate,
      gateLabel: f.gateLabel,
      difficulties,
      // Cap at PRESCRIPTION_SIZE; if the exact tier is thin the quest falls back
      // to the chapter at large (handled in generateGateMock), so still offer one.
      recommendedCount: Math.min(PRESCRIPTION_SIZE, available || PRESCRIPTION_SIZE),
      reason: f.reason,
    };
  }

  return { road, prescription };
}
