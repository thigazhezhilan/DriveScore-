import "server-only";

/**
 * DriveScore GLOBAL question-bank data access.
 *
 * "Global" = questions with `centre_id IS NULL` — owned by the DriveScore
 * platform (not any institute). Only the platform super-admin manages these,
 * through the USER-SCOPED client: the 0006 admin question policies grant an
 * `auth_role()='admin'` caller full CRUD with NO centre check, so a NULL
 * `centre_id` insert/select/update/delete is allowed for admins only.
 *
 * These feed the student self-practice pathways (lesson practice + full mock).
 * The student test flow still fetches question CONTENT via the SERVICE key and
 * strips `answer_index` before the browser — unchanged. This module is never
 * used by students.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/db/client";
import type { Difficulty, Subject } from "@/lib/types";
import { SUBJECTS, type ValidQuestion } from "@/lib/questions/validate";

const IMAGE_BUCKET = "question-images";

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
  imageUrl: string | null;
  language: "en" | "ta";
};

type Row = {
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
  language: string;
};

const SELECT =
  "id, subject, chapter, concept, difficulty, par_time_sec, body, options, answer_index, image_url, language";

function toBank(r: Row): BankQuestion {
  return {
    id: r.id,
    subject: r.subject as Subject,
    chapter: r.chapter,
    concept: r.concept,
    difficulty: r.difficulty as Difficulty,
    parTimeSec: r.par_time_sec,
    text: r.body,
    options: (r.options as string[]) ?? [],
    answerIndex: r.answer_index,
    imageUrl: (r.image_url as string | null) ?? null,
    language: (r.language as "en" | "ta") ?? "en",
  };
}

/** Map a validated question to an insert row — always centre_id: null (global). */
function toInsert(v: ValidQuestion, language: "en" | "ta") {
  return {
    centre_id:    null,
    language,
    source:       "pyq",
    status:       language === "en" ? "live" : "verified", // TA PYQs held for human OCR check
    subject:      v.subject,
    chapter:      v.chapter,
    concept:      v.concept,
    difficulty:   v.difficulty,
    par_time_sec: v.parTimeSec,
    body:         v.text,
    options:      v.options,
    answer_index: v.answerIndex,
  };
}

export type QuestionFilters = {
  subject?: string;
  difficulty?: string;
  chapter?: string;
  q?: string;
};

export async function listGlobalQuestions(
  f: QuestionFilters = {},
  limit = 200,
): Promise<BankQuestion[]> {
  const supabase = client();
  let query = supabase.from("questions").select(SELECT).is("centre_id", null);

  if (f.subject) query = query.eq("subject", f.subject);
  if (f.difficulty) query = query.eq("difficulty", f.difficulty);
  if (f.chapter) query = query.eq("chapter", f.chapter);
  if (f.q) query = query.ilike("body", `%${f.q}%`);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => toBank(r as Row));
}

export async function getGlobalQuestion(id: string): Promise<BankQuestion | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .select(SELECT)
    .is("centre_id", null)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toBank(data as Row) : null;
}

export async function createGlobalQuestion(v: ValidQuestion, language: "en" | "ta"): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("questions").insert(toInsert(v, language));
  if (error) throw error;
}

export async function updateGlobalQuestion(
  id: string,
  v: ValidQuestion,
  language: "en" | "ta",
): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("questions")
    .update(toInsert(v, language))
    .is("centre_id", null)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGlobalQuestion(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("questions")
    .delete()
    .is("centre_id", null)
    .eq("id", id);
  if (error) throw error;
}

/** Bulk insert pre-validated GLOBAL rows; returns how many were written. */
export async function insertGlobalQuestionsBulk(
  rows: ValidQuestion[],
  language: "en" | "ta",
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .insert(rows.map((v) => toInsert(v, language)))
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export type QuestionStats = {
  total: number;
  bySubject: { subject: Subject; count: number }[];
};

export async function globalQuestionStats(): Promise<QuestionStats> {
  const supabase = client();
  const { data, error } = await supabase
    .from("questions")
    .select("subject")
    .is("centre_id", null);
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

// ───────────────────────── Image (diagram) questions ─────────────────────────

/** Upload a figure to the public Storage bucket; returns its public URL. */
export async function uploadQuestionImage(
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const supabase = getServiceClient();
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(key, bytes, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

export type ImageQuestionInput = {
  subject: Subject;
  chapter: string;
  concept: string;
  difficulty: Difficulty;
  parTimeSec: number;
  text: string; // may be empty for image-only questions
  options: [string, string, string, string]; // may contain blanks
  answerIndex: number; // 0..3
  imageUrl: string | null; // null for draft questions awaiting image confirmation
  language: "en" | "ta";
  status?: "draft" | "live"; // omit to use the default per-language rule
};

/** Insert a global image/diagram question (uses the service client). */
export async function createGlobalImageQuestion(v: ImageQuestionInput): Promise<void> {
  // Explicit status takes priority; otherwise: null imageUrl forces draft, else
  // fall back to the per-language default (en=live, ta=verified).
  const status =
    v.status ?? (v.imageUrl === null ? "draft" : v.language === "en" ? "live" : "verified");
  if (status !== "draft" && v.imageUrl === null) {
    throw new Error("image_url is required when status is not 'draft'");
  }
  const supabase = getServiceClient();
  const { error } = await supabase.from("questions").insert({
    centre_id:    null,
    language:     v.language,
    source:       "pyq",
    status,
    subject:      v.subject,
    chapter:      v.chapter,
    concept:      v.concept,
    difficulty:   v.difficulty,
    par_time_sec: v.parTimeSec,
    body:         v.text,
    options:      v.options,
    answer_index: v.answerIndex,
    image_url:    v.imageUrl,
  });
  if (error) throw error;
}
