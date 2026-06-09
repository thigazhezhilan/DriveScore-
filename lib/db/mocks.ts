import "server-only";

/**
 * Mock-builder data access (Milestone 2c-2).
 *
 * Admin build/manage + the student's "assigned mocks" list. All reads/writes go
 * through the USER-SCOPED client so the 0005 RLS policies enforce who sees what
 * (staff: own centre incl. drafts; students: published mocks for their batch).
 * `centre_id` is also taken from the session here — never from the client.
 *
 * Question CONTENT (with answer keys) is NOT fetched here; the test flow still
 * loads it via the service key (`getMockWithQuestions`) and strips
 * `answer_index` before the browser.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listBatchesForCentre } from "@/lib/db/queries";
import type { BankQuestion } from "@/lib/db/questions";

function client() {
  return createSupabaseServerClient();
}

export type MockStatus = "draft" | "published";

/** A question as shown in the builder's picker (no answer key). */
export type PickerQuestion = Omit<BankQuestion, "answerIndex">;

export type MockListItem = {
  id: string;
  title: string;
  status: MockStatus;
  batchId: string | null;
  batchName: string | null;
  questionCount: number;
  maxAttempts: number;
};

export type MockForEdit = {
  id: string;
  title: string;
  status: MockStatus;
  batchId: string | null;
  questionIds: string[]; // ordered by position
  maxAttempts: number;
};

export type StudentMock = {
  id: string;
  title: string;
  questionCount: number;
  attemptCount: number;
  maxAttempts: number;
  latestAttemptId: string | null;
};

/** Count mock_questions per mock id (RLS-scoped to the caller). */
async function countQuestions(
  supabase: ReturnType<typeof client>,
  mockIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (mockIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("mock_questions")
    .select("mock_id")
    .in("mock_id", mockIds);
  if (error) throw error;
  for (const r of data ?? []) {
    counts.set(r.mock_id as string, (counts.get(r.mock_id as string) ?? 0) + 1);
  }
  return counts;
}

// ───────────────────────────── Admin ─────────────────────────────

export async function listMocksForCentre(centreId: string): Promise<MockListItem[]> {
  const supabase = client();
  const { data: mocks, error } = await supabase
    .from("mocks")
    .select("id, title, status, batch_id, max_attempts")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = mocks ?? [];
  const batches = await listBatchesForCentre(centreId);
  const batchName = new Map(batches.map((b) => [b.id, b.name]));
  const counts = await countQuestions(
    supabase,
    rows.map((m) => m.id as string),
  );

  return rows.map((m) => ({
    id: m.id as string,
    title: m.title as string,
    status: (m.status as MockStatus) ?? "draft",
    batchId: (m.batch_id as string | null) ?? null,
    batchName: m.batch_id ? batchName.get(m.batch_id as string) ?? null : null,
    questionCount: counts.get(m.id as string) ?? 0,
    maxAttempts: (m.max_attempts as number) ?? 1,
  }));
}

export async function getMockForEdit(
  centreId: string,
  mockId: string,
): Promise<MockForEdit | null> {
  const supabase = client();
  const { data: mock, error } = await supabase
    .from("mocks")
    .select("id, title, status, batch_id, max_attempts")
    .eq("centre_id", centreId)
    .eq("id", mockId)
    .maybeSingle();
  if (error) throw error;
  if (!mock) return null;

  const { data: links, error: lErr } = await supabase
    .from("mock_questions")
    .select("question_id, position")
    .eq("mock_id", mockId)
    .order("position", { ascending: true });
  if (lErr) throw lErr;

  return {
    id: mock.id as string,
    title: mock.title as string,
    status: (mock.status as MockStatus) ?? "draft",
    batchId: (mock.batch_id as string | null) ?? null,
    questionIds: (links ?? []).map((l) => l.question_id as string),
    maxAttempts: (mock.max_attempts as number) ?? 1,
  };
}

export async function createMock(
  centreId: string,
  input: { title: string; batchId: string | null; status: MockStatus; maxAttempts: number },
): Promise<string> {
  const supabase = client();
  const { data, error } = await supabase
    .from("mocks")
    .insert({
      centre_id: centreId, // from session — never the client
      title: input.title,
      batch_id: input.batchId,
      status: input.status,
      max_attempts: input.maxAttempts,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMockMeta(
  centreId: string,
  mockId: string,
  input: { title: string; batchId: string | null; status: MockStatus; maxAttempts: number },
): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("mocks")
    .update({
      title: input.title,
      batch_id: input.batchId,
      status: input.status,
      max_attempts: input.maxAttempts,
    })
    .eq("centre_id", centreId)
    .eq("id", mockId);
  if (error) throw error;
}

export async function setMockStatus(
  centreId: string,
  mockId: string,
  status: MockStatus,
): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("mocks")
    .update({ status })
    .eq("centre_id", centreId)
    .eq("id", mockId);
  if (error) throw error;
}

export async function deleteMock(centreId: string, mockId: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("mocks")
    .delete()
    .eq("centre_id", centreId)
    .eq("id", mockId);
  if (error) throw error;
}

/**
 * Replace a mock's question links with `questionIds`, in order. Deletes the old
 * links then inserts the new ones (RLS: admin, parent mock in their centre).
 */
export async function setMockQuestions(
  mockId: string,
  questionIds: string[],
): Promise<void> {
  const supabase = client();
  const { error: delErr } = await supabase
    .from("mock_questions")
    .delete()
    .eq("mock_id", mockId);
  if (delErr) throw delErr;

  if (questionIds.length === 0) return;
  const rows = questionIds.map((question_id, position) => ({
    mock_id: mockId,
    question_id,
    position,
  }));
  const { error: insErr } = await supabase.from("mock_questions").insert(rows);
  if (insErr) throw insErr;
}

/**
 * Of the given ids, return those that are genuinely in this centre's bank
 * (defends against attaching another centre's question id).
 */
export async function filterCentreQuestionIds(
  centreId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .eq("centre_id", centreId)
    .in("id", ids);
  if (error) throw error;
  const found = new Set((data ?? []).map((r) => r.id as string));
  // Preserve the caller's order, keep only valid ids.
  return ids.filter((id) => found.has(id));
}

// ───────────────────────────── Student ─────────────────────────────

/** The published mocks for the logged-in student's batch (RLS-scoped). */
export async function listPublishedMocksForStudent(): Promise<StudentMock[]> {
  const supabase = client();
  // RLS already restricts a student to published mocks for their own batch.
  // Exclude personal self-practice mocks (owner_student_id set) — those belong
  // to the /practice flow, not the institute-assigned "Your mocks" list.
  const { data: mocks, error } = await supabase
    .from("mocks")
    .select("id, title, max_attempts")
    .eq("status", "published")
    .is("owner_student_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = mocks ?? [];
  const counts = await countQuestions(
    supabase,
    rows.map((m) => m.id as string),
  );

  const result: StudentMock[] = [];
  for (const m of rows) {
    // RLS returns only the student's own submitted attempts.
    const { data: attempts } = await supabase
      .from("attempts")
      .select("id, submitted_at")
      .eq("mock_id", m.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });
    const attemptCount = attempts?.length ?? 0;
    result.push({
      id: m.id as string,
      title: m.title as string,
      questionCount: counts.get(m.id as string) ?? 0,
      attemptCount,
      maxAttempts: (m.max_attempts as number) ?? 1,
      latestAttemptId: attempts?.[0]?.id ?? null,
    });
  }
  return result;
}

/**
 * Return the mock IF it is visible to the caller (student: published + own
 * batch; staff: own centre) — used as the server-side access check before the
 * test flow loads question content with the service key. Null = not allowed.
 */
export async function getVisibleMock(
  mockId: string,
): Promise<{ id: string; title: string } | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("mocks")
    .select("id, title")
    .eq("id", mockId)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id as string, title: data.title as string } : null;
}
