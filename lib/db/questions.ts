import "server-only";

/**
 * Question-bank data access (Milestone 2c-1).
 *
 * All reads/writes go through the USER-SCOPED client (anon key + the admin's
 * session) so the 0004 RLS policies enforce the centre boundary at the database
 * level. As belt-and-suspenders we ALSO filter/insert with `centre_id` taken
 * from the caller's session — never from client/upload input.
 *
 * Admins legitimately see `answer_index` for their OWN questions here (they're
 * managing the keys). This module is never used by the student test flow, which
 * keeps fetching via the service key and stripping `answer_index`.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Difficulty, Subject } from "@/lib/types";
import { SUBJECTS, type ValidQuestion } from "@/lib/questions/validate";

function client() {
  return createSupabaseServerClient();
}

export type BankQuestion = {
  id: string;
  subject: Subject;
  chapter: string;
  concept: string;
  difficulty: Difficulty;
  parTimeSec: number;
  text: string;
  options: string[];
  answerIndex: number;
};

type Row = {
  id: string;
  subject: string;
  chapter: string;
  concept: string;
  difficulty: string;
  par_time_sec: number;
  text: string;
  options: unknown;
  answer_index: number;
};

const SELECT =
  "id, subject, chapter, concept, difficulty, par_time_sec, text, options, answer_index";

function toBank(r: Row): BankQuestion {
  return {
    id: r.id,
    subject: r.subject as Subject,
    chapter: r.chapter,
    concept: r.concept,
    difficulty: r.difficulty as Difficulty,
    parTimeSec: r.par_time_sec,
    text: r.text,
    options: (r.options as string[]) ?? [],
    answerIndex: r.answer_index,
  };
}

function toInsert(centreId: string, v: ValidQuestion) {
  return {
    centre_id: centreId, // always from session — never from the client
    subject: v.subject,
    chapter: v.chapter,
    concept: v.concept,
    difficulty: v.difficulty,
    par_time_sec: v.parTimeSec,
    text: v.text,
    options: v.options,
    answer_index: v.answerIndex,
  };
}

export type QuestionFilters = {
  subject?: string;
  difficulty?: string;
  chapter?: string;
  q?: string;
};

export async function listQuestions(
  centreId: string,
  f: QuestionFilters = {},
): Promise<BankQuestion[]> {
  const supabase = client();
  let query = supabase.from("questions").select(SELECT).eq("centre_id", centreId);

  if (f.subject) query = query.eq("subject", f.subject);
  if (f.difficulty) query = query.eq("difficulty", f.difficulty);
  if (f.chapter) query = query.eq("chapter", f.chapter);
  if (f.q) query = query.ilike("text", `%${f.q}%`);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toBank(r as Row));
}

export async function getQuestion(
  centreId: string,
  id: string,
): Promise<BankQuestion | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .select(SELECT)
    .eq("centre_id", centreId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toBank(data as Row) : null;
}

export async function createQuestion(
  centreId: string,
  v: ValidQuestion,
): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("questions").insert(toInsert(centreId, v));
  if (error) throw error;
}

export async function updateQuestion(
  centreId: string,
  id: string,
  v: ValidQuestion,
): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("questions")
    .update(toInsert(centreId, v))
    .eq("centre_id", centreId)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestion(centreId: string, id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("centre_id", centreId)
    .eq("id", id);
  if (error) throw error;
}

/** Bulk insert pre-validated rows; returns how many were actually written. */
export async function insertQuestionsBulk(
  centreId: string,
  rows: ValidQuestion[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .insert(rows.map((v) => toInsert(centreId, v)))
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** Distinct chapters in this centre's bank (for the filter dropdown). */
export async function listChapters(centreId: string): Promise<string[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .select("chapter")
    .eq("centre_id", centreId);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.chapter as string))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export type QuestionStats = {
  total: number;
  bySubject: { subject: Subject; count: number }[];
};

export async function questionStats(centreId: string): Promise<QuestionStats> {
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .select("subject")
    .eq("centre_id", centreId);
  if (error) throw error;
  const rows = data ?? [];
  return {
    total: rows.length,
    bySubject: SUBJECTS.map((subject) => ({
      subject,
      count: rows.filter((r) => r.subject === subject).length,
    })),
  };
}
