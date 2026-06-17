import "server-only";

/**
 * Teacher class-insights data layer — turns the per-student rating data into a
 * centre-level view for the centre manager (the B2B buyer). All reads are
 * RLS-scoped: the teacher's user-session client only returns rows for students
 * in their own centre.
 *
 * One call, all bulk queries (no N+1), assembled in memory:
 *   - per-student standing (level, rating, activity, weekly change)
 *   - a leaderboard (the competitive hook)
 *   - the class "re-teach this week" list (chapters the batch is weakest in)
 *   - headline stats (active students, class average, tests this week)
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Difficulty, Subject } from "@/lib/types";
import {
  rollupAnswersToDiagnosis,
  type AnswerForRollup,
  type DiagnosisCounts,
} from "../teacher-rollup";

export type { DiagnosisCounts };

/** A student rated below "Scholar" on a chapter is counted as struggling. */
const SCHOLAR_FLOOR = 1050;
const WEEK_MS = 7 * 86400000;

export type ClassStudent = {
  id: string;
  name: string;
  hasLogin: boolean;
  rating: number | null; // overall rating; null until first graded attempt
  level: string | null;
  attempts: number;
  lastActive: number | null; // ms of most recent submitted attempt
  weeklyDelta: number; // net rating change in the last 7 days
  latestAttemptId: string | null;
};

export type WeakChapter = {
  subject: Subject;
  chapter: string;
  avgRating: number;
  strugglingCount: number; // students below Scholar on this chapter
  studentCount: number;
};

export type ClassStats = {
  totalStudents: number;
  withLogins: number;
  activeThisWeek: number;
  ratedStudents: number;
  avgRating: number | null;
  attemptsThisWeek: number;
};

export type TeacherInsights = {
  students: ClassStudent[];
  leaderboard: ClassStudent[];
  weakChapters: WeakChapter[];
  stats: ClassStats;
  /** Per-chapter diagnosis breakdown keyed by "subject|chapter". Additive — does not affect other fields. */
  diagnosisByChapter: Record<string, DiagnosisCounts>;
};

export async function getTeacherClassInsights(
  centreId: string,
): Promise<TeacherInsights> {
  const sb = createSupabaseServerClient();
  const emptyStats: ClassStats = {
    totalStudents: 0,
    withLogins: 0,
    activeThisWeek: 0,
    ratedStudents: 0,
    avgRating: null,
    attemptsThisWeek: 0,
  };
  const base = { students: [], leaderboard: [], weakChapters: [], stats: emptyStats, diagnosisByChapter: {} };

  const { data: studentRows, error: sErr } = await sb
    .from("students")
    .select("id, name, profile_id")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: true });
  if (sErr) throw sErr;
  const studentList = studentRows ?? [];
  if (studentList.length === 0) return base;
  const ids = studentList.map((s) => s.id as string);

  const weekAgoIso = new Date(Date.now() - WEEK_MS).toISOString();

  // Bulk reads, all RLS-scoped to the teacher's students.
  const [ratingRes, attemptRes, eventRes, chapterRes] = await Promise.all([
    sb.from("student_ratings").select("student_id, rating, level").in("student_id", ids).eq("subject", "Overall"),
    // mock_id is included so the diagnosis rollup can filter out focus-practice
    // attempts (focus mocks have centre_id = NULL so they are invisible to teachers
    // via RLS — we use that visibility check to enforce privacy below).
    sb.from("attempts").select("id, student_id, submitted_at, mock_id").in("student_id", ids).not("submitted_at", "is", null).order("submitted_at", { ascending: false }),
    sb.from("rating_events").select("student_id, delta").in("student_id", ids).gte("created_at", weekAgoIso),
    sb.from("student_chapter_ratings").select("subject, chapter, rating").in("student_id", ids),
  ]);
  if (ratingRes.error) throw ratingRes.error;
  if (attemptRes.error) throw attemptRes.error;
  if (eventRes.error) throw eventRes.error;
  if (chapterRes.error) throw chapterRes.error;

  const overallById = new Map<string, { rating: number; level: string }>();
  for (const r of ratingRes.data ?? []) {
    overallById.set(r.student_id as string, {
      rating: Math.round(Number(r.rating)),
      level: r.level as string,
    });
  }

  // Per-student attempt rollup (rows already newest-first).
  const attemptCount = new Map<string, number>();
  const lastActive = new Map<string, number>();
  const latestAttemptId = new Map<string, string>();
  let attemptsThisWeek = 0;
  const weekAgoMs = Date.now() - WEEK_MS;
  for (const a of attemptRes.data ?? []) {
    const sid = a.student_id as string;
    const t = new Date(a.submitted_at as string).getTime();
    attemptCount.set(sid, (attemptCount.get(sid) ?? 0) + 1);
    if (!lastActive.has(sid)) {
      lastActive.set(sid, t); // first seen = newest
      latestAttemptId.set(sid, a.id as string);
    }
    if (t >= weekAgoMs) attemptsThisWeek++;
  }

  const weeklyDelta = new Map<string, number>();
  for (const e of eventRes.data ?? []) {
    const sid = e.student_id as string;
    weeklyDelta.set(sid, (weeklyDelta.get(sid) ?? 0) + Number(e.delta));
  }

  const students: ClassStudent[] = studentList.map((s) => {
    const sid = s.id as string;
    const ov = overallById.get(sid);
    return {
      id: sid,
      name: s.name as string,
      hasLogin: s.profile_id !== null,
      rating: ov?.rating ?? null,
      level: ov?.level ?? null,
      attempts: attemptCount.get(sid) ?? 0,
      lastActive: lastActive.get(sid) ?? null,
      weeklyDelta: weeklyDelta.get(sid) ?? 0,
      latestAttemptId: latestAttemptId.get(sid) ?? null,
    };
  });

  // Leaderboard: rated students, highest rating first.
  const leaderboard = students
    .filter((s) => s.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10);

  // Class weak chapters: average rating per (subject, chapter) across students.
  const agg = new Map<string, { subject: Subject; chapter: string; sum: number; n: number; struggling: number }>();
  for (const r of chapterRes.data ?? []) {
    const subject = r.subject as Subject;
    const chapter = r.chapter as string;
    const rating = Number(r.rating);
    const key = `${subject}|${chapter}`;
    const cur = agg.get(key) ?? { subject, chapter, sum: 0, n: 0, struggling: 0 };
    cur.sum += rating;
    cur.n += 1;
    if (rating < SCHOLAR_FLOOR) cur.struggling += 1;
    agg.set(key, cur);
  }
  const weakChapters: WeakChapter[] = [...agg.values()]
    .map((c) => ({
      subject: c.subject,
      chapter: c.chapter,
      avgRating: Math.round(c.sum / c.n),
      strugglingCount: c.struggling,
      studentCount: c.n,
    }))
    .sort((a, b) => a.avgRating - b.avgRating)
    .slice(0, 8);

  const ratedStudents = students.filter((s) => s.rating !== null);
  const stats: ClassStats = {
    totalStudents: students.length,
    withLogins: students.filter((s) => s.hasLogin).length,
    activeThisWeek: students.filter((s) => s.lastActive !== null && s.lastActive >= weekAgoMs).length,
    ratedStudents: ratedStudents.length,
    avgRating:
      ratedStudents.length > 0
        ? Math.round(ratedStudents.reduce((sum, s) => sum + (s.rating ?? 0), 0) / ratedStudents.length)
        : null,
    attemptsThisWeek,
  };

  // ── Diagnosis rollup ────────────────────────────────────────────────────────
  // Collect recent attempt IDs whose mock is VISIBLE to this teacher. Focus mocks
  // have centre_id = NULL so the teacher's mocks_select RLS excludes them — this
  // is the privacy guarantee for the focus feature: focus-practice answers never
  // reach the teacher diagnosis rollup.
  const recentCandidateAttempts = (attemptRes.data ?? []).filter(
    (a) => new Date(a.submitted_at as string).getTime() >= weekAgoMs,
  );
  const candidateMockIds = [...new Set(recentCandidateAttempts.map((a) => a.mock_id as string))];

  const visibleMockIdSet = new Set<string>();
  if (candidateMockIds.length > 0) {
    const { data: visibleMocks } = await sb
      .from("mocks")
      .select("id")
      .in("id", candidateMockIds);
    for (const m of visibleMocks ?? []) visibleMockIdSet.add(m.id as string);
  }

  const recentAttemptIds: string[] = [];
  const attemptToStudent = new Map<string, string>();
  for (const a of recentCandidateAttempts) {
    if (visibleMockIdSet.has(a.mock_id as string)) {
      recentAttemptIds.push(a.id as string);
      attemptToStudent.set(a.id as string, a.student_id as string);
    }
  }

  let diagnosisByChapter: Record<string, DiagnosisCounts> = {};

  if (recentAttemptIds.length > 0) {
    const t0 = performance.now();

    // One joined query: answers + the question fields needed for diagnosis.
    // answer_index reaches the server only — counts are the only thing returned
    // to the client UI, never the key itself.
    const { data: ansRows } = await sb
      .from("answers")
      .select(
        "attempt_id, picked_index, time_sec, first_answer_index, questions(id, subject, chapter, difficulty, par_time_sec, answer_index)",
      )
      .in("attempt_id", recentAttemptIds);

    type AnsRow = {
      attempt_id: string;
      picked_index: number | null;
      time_sec: number | null;
      first_answer_index: number | null;
      questions: {
        id: string;
        subject: string;
        chapter: string;
        difficulty: string;
        par_time_sec: number;
        answer_index: number;
      } | null;
    };

    const rollupInputs: AnswerForRollup[] = [];
    for (const row of (ansRows as AnsRow[] | null) ?? []) {
      const q = row.questions;
      if (!q) continue;
      const studentId = attemptToStudent.get(row.attempt_id);
      if (!studentId) continue;
      rollupInputs.push({
        attemptId: row.attempt_id,
        studentId,
        question: {
          id: q.id,
          subject: q.subject as Subject,
          chapter: q.chapter,
          concept: "",
          difficulty: q.difficulty as Difficulty,
          parTimeSec: q.par_time_sec,
          text: "",
          options: [],
          answerIndex: q.answer_index,
          imageUrl: null,
        },
        pickedIndex: row.picked_index,
        timeSec: row.time_sec ?? 0,
        firstPickedIndex: row.first_answer_index,
      });
    }

    diagnosisByChapter = rollupAnswersToDiagnosis(rollupInputs);

    const elapsed = (performance.now() - t0).toFixed(1);
    console.log(
      `[TeacherInsights] Diagnosis rollup: ${elapsed}ms — ${rollupInputs.length} answers across ${recentAttemptIds.length} recent attempts`,
    );
  }

  return { students, leaderboard, weakChapters, stats, diagnosisByChapter };
}
