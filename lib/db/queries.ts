import "server-only";

/**
 * Server-side data-access layer.
 *
 * These functions are the ONLY place that talks to the database. They map raw
 * DB rows onto the existing domain types (`Question`, `Attempt`) so the pure
 * modules (`diagnose.ts`, `grade.ts`) and the report components need no changes.
 *
 * The diagnosis category is deliberately NOT read or written here — it is
 * always recomputed by `diagnose.ts` at read time from (question + answer).
 */

import { getServiceClient } from "./client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Attempt,
  Difficulty,
  Question,
  Subject,
} from "@/lib/types";

/**
 * The USER-SCOPED client (anon key + the caller's session). Reads through this
 * client are subject to RLS, so Postgres returns only rows the logged-in user
 * is permitted to see. Use this for user-facing reads; use `getServiceClient`
 * only for privileged work (grading with answer keys, admin user creation).
 */
function getUserClient() {
  return createSupabaseServerClient();
}

/** Shape of a `questions` row as returned by Supabase (post-migration 0020 column names). */
type QuestionRow = {
  id: string;
  subject: string;
  chapter: string;
  concept: string;
  difficulty: string;
  par_time_sec: number;
  body: string;
  options: unknown;
  answer_index: number;
  image_url?: string | null;
  language?: string | null;
};

/** Map a DB question row onto the domain `Question` type. */
function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    subject: row.subject as Subject,
    chapter: row.chapter,
    concept: row.concept,
    difficulty: row.difficulty as Difficulty,
    parTimeSec: row.par_time_sec,
    text: row.body,
    options: (row.options as string[]) ?? [],
    answerIndex: row.answer_index,
    imageUrl: (row.image_url as string | null) ?? null,
    language: (row.language as "en" | "ta" | null) ?? null,
  };
}

export type MockWithQuestions = {
  id: string;
  title: string;
  questions: Question[];
};

/** A mock + its questions, ordered by `position`. Single joined query. */
export async function getMockWithQuestions(
  mockId: string,
): Promise<MockWithQuestions> {
  const supabase = getServiceClient();

  const { data: mock, error } = await supabase
    .from("mocks")
    .select(
      "id, title, mock_questions(position, questions(id,subject,chapter,concept,difficulty,par_time_sec,body,options,answer_index,image_url,language))",
    )
    .eq("id", mockId)
    .maybeSingle();
  if (error) throw error;
  if (!mock) throw new Error(`Mock ${mockId} not found after creation`);

  const questions = ((mock.mock_questions as unknown as { position: number; questions: QuestionRow }[]) ?? [])
    .sort((a, b) => a.position - b.position)
    .map((r) => r.questions)
    .filter((q): q is QuestionRow => q !== null)
    .map(toQuestion);

  return { id: mock.id as string, title: mock.title as string, questions };
}

/**
 * The single seeded mock (there is exactly one until question-upload lands in
 * Milestone 2c). Returns null if the DB has not been seeded yet.
 */
export async function getSeededMock(): Promise<{ id: string; title: string } | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("mocks")
    .select("id, title")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * The seeded stand-in student (Aarav Menon), used until login lands in 2b.
 * Falls back to the first student if the name is not found.
 */
export async function getSeededStudent(): Promise<{ id: string; name: string } | null> {
  const supabase = getServiceClient();
  const { data: byName } = await supabase
    .from("students")
    .select("id, name")
    .eq("name", "Aarav Menon")
    .limit(1);
  if (byName && byName.length > 0) return byName[0];

  const { data, error } = await supabase
    .from("students")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Count submitted attempts for a student on a specific mock (service client). */
export async function countSubmittedAttempts(
  mockId: string,
  studentId: string,
): Promise<number> {
  const supabase = getServiceClient();
  const { count, error } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("mock_id", mockId)
    .eq("student_id", studentId)
    .not("submitted_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}

/** Read max_attempts for a mock (service client). */
export async function getMockMaxAttempts(mockId: string): Promise<number> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("mocks")
    .select("max_attempts")
    .eq("id", mockId)
    .maybeSingle();
  if (error) throw error;
  return (data?.max_attempts as number) ?? 1;
}

/** Create a new (in-progress) attempt row, returning its id. */
export async function createAttempt(
  mockId: string,
  studentId: string,
): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("attempts")
    .insert({ mock_id: mockId, student_id: studentId })
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Attempt insert returned no rows — check attempts table constraints.");
  return data[0].id as string;
}

/**
 * Persist a finished attempt: write each per-question answer row and stamp the
 * attempt with its submission time + computed totals.
 *
 * `totals` are pre-computed by the caller via the existing grading logic — we
 * store the score/accuracy, but NEVER the diagnosis category.
 */
export async function saveAttempt(
  attemptId: string,
  answers: Attempt[],
  totals: { totalMarks: number; maxMarks: number; accuracy: number },
): Promise<void> {
  const supabase = getServiceClient();

  const rows = answers.map((a) => ({
    attempt_id: attemptId,
    question_id: a.questionId,
    picked_index: a.pickedIndex,
    time_sec: a.timeSec,
    // First-touched option (for SELF_DOUBT diagnosis). Never used for grading.
    first_answer_index: a.firstPickedIndex ?? null,
  }));

  const { error: ansErr } = await supabase.from("answers").insert(rows);
  if (ansErr) throw ansErr;

  const { error: updErr } = await supabase
    .from("attempts")
    .update({
      submitted_at: new Date().toISOString(),
      total_marks: totals.totalMarks,
      max_marks: totals.maxMarks,
      accuracy: totals.accuracy,
    })
    .eq("id", attemptId);
  if (updErr) throw updErr;
}

export type LoadedAttempt = {
  attemptId: string;
  questions: Question[];
  attempts: Attempt[];
  submittedAt: string | null;
  /** The student who owns this attempt (for access checks). */
  studentId: string;
  /** The centre this attempt belongs to (via the student's batch). */
  centreId: string | null;
};

/**
 * Load a finished attempt in the shape the report needs: the mock's ordered
 * questions plus the student's answers. The report screen then runs the
 * existing `buildReport` / `diagnose` on this — category is computed at read
 * time, not stored.
 */
export async function getAttempt(attemptId: string): Promise<LoadedAttempt | null> {
  const supabase = getUserClient();

  const { data: attempt, error: aErr } = await supabase
    .from("attempts")
    .select("id, mock_id, student_id, submitted_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!attempt) return null;

  // Run the three independent reads in parallel instead of sequentially.
  const [studentRes, questionsResult, answersRes] = await Promise.all([
    supabase
      .from("students")
      .select("centre_id, batch_id")
      .eq("id", attempt.student_id)
      .maybeSingle(),
    getMockWithQuestions(attempt.mock_id as string),
    supabase
      .from("answers")
      .select("question_id, picked_index, time_sec, first_answer_index")
      .eq("attempt_id", attemptId),
  ]);
  if (answersRes.error) throw answersRes.error;

  // centre_id is directly on students since migration 0013; batch fallback for
  // older rows that were created before the column was backfilled.
  let centreId: string | null = (studentRes.data?.centre_id as string | null) ?? null;
  if (!centreId && studentRes.data?.batch_id) {
    const { data: batchRow } = await supabase
      .from("batches")
      .select("centre_id")
      .eq("id", studentRes.data.batch_id)
      .maybeSingle();
    centreId = (batchRow?.centre_id as string | null) ?? null;
  }

  const attempts: Attempt[] = (answersRes.data ?? []).map((r) => ({
    questionId: r.question_id as string,
    pickedIndex: (r.picked_index as number | null) ?? null,
    timeSec: (r.time_sec as number) ?? 0,
    firstPickedIndex: (r.first_answer_index as number | null) ?? null,
  }));

  return {
    attemptId: attempt.id as string,
    questions: questionsResult.questions,
    attempts,
    submittedAt: (attempt.submitted_at as string | null) ?? null,
    studentId: attempt.student_id as string,
    centreId,
  };
}

// ─────────────────────────── Auth / profiles ───────────────────────────

export type Profile = {
  id: string;
  role: "admin" | "teacher" | "student";
  centreId: string | null;
  fullName: string | null;
  /** null = not yet chosen (student must select on first login). */
  preferredLanguage: "en" | "ta" | null;
};

/** Read a profile by auth user id (service client — bypasses RLS). */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, centre_id, full_name, preferred_language")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    role: data.role,
    centreId: data.centre_id ?? null,
    fullName: data.full_name ?? null,
    preferredLanguage: (data.preferred_language === "ta" ? "ta" : data.preferred_language === "en" ? "en" : null),
  };
}

/** The `students` row linked to a given login profile, if any. */
export async function getStudentByProfileId(
  profileId: string,
): Promise<{ id: string; name: string; centreId: string | null } | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, centre_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, name: data.name, centreId: data.centre_id ?? null };
}

/** Batches for a centre (for the admin's batch picker / teacher lookups). */
export async function listBatchesForCentre(
  centreId: string,
): Promise<{ id: string; name: string; teacherId: string | null }[]> {
  const supabase = getUserClient(); // RLS-scoped (centre/teacher visibility)
  const { data, error } = await supabase
    .from("batches")
    .select("id, name, teacher_id")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    teacherId: b.teacher_id ?? null,
  }));
}

export type StudentListRow = {
  id: string;
  name: string;
  batchName: string;
  hasLogin: boolean;
  latestAttemptId: string | null;
};

/** Students within a centre, with their batch + latest attempt (for lists). */
export async function listStudentsForCentre(
  centreId: string,
): Promise<StudentListRow[]> {
  const supabase = getUserClient(); // RLS-scoped (admin: own centre)
  const batches = await listBatchesForCentre(centreId);
  if (batches.length === 0) return [];
  const batchName = new Map(batches.map((b) => [b.id, b.name]));

  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, batch_id, profile_id")
    .in(
      "batch_id",
      batches.map((b) => b.id),
    )
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = students ?? [];
  if (rows.length === 0) return [];

  // One bulk query for all students' latest attempts instead of N per-student queries.
  const studentIds = rows.map((s) => s.id as string);
  const { data: allAttempts } = await supabase
    .from("attempts")
    .select("id, student_id")
    .in("student_id", studentIds)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const latestByStudent = new Map<string, string>();
  for (const a of allAttempts ?? []) {
    const sid = a.student_id as string;
    if (!latestByStudent.has(sid)) latestByStudent.set(sid, a.id as string);
  }

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    batchName: batchName.get(s.batch_id) ?? "—",
    hasLogin: s.profile_id !== null,
    latestAttemptId: latestByStudent.get(s.id) ?? null,
  }));
}

/** Students in a specific batch (for the teacher dashboard). */
export async function listStudentsForBatch(
  batchId: string,
): Promise<StudentListRow[]> {
  const supabase = getUserClient(); // RLS-scoped (teacher: own batch)
  const { data: batch } = await supabase
    .from("batches")
    .select("name")
    .eq("id", batchId)
    .maybeSingle();
  const batchName = batch?.name ?? "—";

  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, profile_id")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = students ?? [];
  if (rows.length === 0) return [];

  const studentIds = rows.map((s) => s.id as string);
  const { data: allAttempts } = await supabase
    .from("attempts")
    .select("id, student_id")
    .in("student_id", studentIds)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const latestByStudent = new Map<string, string>();
  for (const a of allAttempts ?? []) {
    const sid = a.student_id as string;
    if (!latestByStudent.has(sid)) latestByStudent.set(sid, a.id as string);
  }

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    batchName,
    hasLogin: s.profile_id !== null,
    latestAttemptId: latestByStudent.get(s.id) ?? null,
  }));
}

/** The batch a teacher owns (one per teacher for now). */
export async function getBatchForTeacher(
  teacherProfileId: string,
): Promise<{ id: string; name: string } | null> {
  const supabase = getUserClient(); // RLS-scoped (teacher owns the batch)
  const { data, error } = await supabase
    .from("batches")
    .select("id, name")
    .eq("teacher_id", teacherProfileId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * Create a student login: an auth user (email pre-confirmed) + profile +
 * linked students row. Service/admin only. Returns the temp password to show
 * once to the admin.
 */
export async function createStudentAccount(params: {
  fullName: string;
  email: string;
  centreId: string;
  tempPassword: string;
}): Promise<{ email: string; tempPassword: string }> {
  const supabase = getServiceClient();

  // 1. Auth user, email pre-confirmed so they can log in immediately.
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.tempPassword,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
  });
  if (cErr) throw cErr;
  const userId = created.user.id;

  // 2. Profile (role student, this centre).
  const { error: pErr } = await supabase.from("profiles").upsert({
    id: userId,
    role: "student",
    centre_id: params.centreId,
    full_name: params.fullName,
  });
  if (pErr) throw pErr;

  // 3. Student row, linked to the profile + the centre (no batch).
  const { error: sErr } = await supabase.from("students").insert({
    centre_id: params.centreId,
    name: params.fullName,
    profile_id: userId,
  });
  if (sErr) throw sErr;

  return { email: params.email, tempPassword: params.tempPassword };
}
