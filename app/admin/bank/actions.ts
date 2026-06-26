"use server";

/**
 * DriveScore GLOBAL question-bank server actions (platform super-admin).
 *
 * Guarded by `requireRole("admin")`. Every question written here has
 * `centre_id = NULL` (global / platform-owned) — set server-side in the data
 * layer, never from the client. Both the single-add form and the CSV import
 * RE-VALIDATE through the shared `validateRow` before anything is written.
 *
 * Mirrors app/admin/questions/actions.ts (the teacher, centre-scoped bank) but
 * for the platform-wide pool that powers student self-practice.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  createGlobalImageQuestion,
  createGlobalQuestion,
  deleteGlobalQuestion,
  getGlobalQuestion,
  insertGlobalQuestionsBulk,
  updateGlobalQuestion,
  uploadQuestionImage,
} from "@/lib/db/globalQuestions";
import { validateRow, type RawRow, type ValidQuestion } from "@/lib/questions/validate";
import { DIFFICULTIES, SUBJECTS } from "@/lib/questions/validate";
import type { Difficulty, Subject } from "@/lib/types";

export type QuestionFormState = { error: string | null; ok: boolean };

const MAX_IMPORT_ROWS = 5000;

function parseLanguage(fd: FormData): "en" | "ta" | null {
  const v = String(fd.get("language") ?? "").trim();
  return v === "en" || v === "ta" ? v : null;
}

/** Build a RawRow from the single-question form (mirrors the CSV columns). */
function rowFromForm(fd: FormData): RawRow {
  return {
    subject:       fd.get("subject"),
    chapter:       fd.get("chapter"),
    concept:       fd.get("concept"),
    difficulty:    fd.get("difficulty"),
    par_time_sec:  fd.get("par_time_sec"),
    question_text: fd.get("question_text"),
    option_a:      fd.get("option_a"),
    option_b:      fd.get("option_b"),
    option_c:      fd.get("option_c"),
    option_d:      fd.get("option_d"),
    correct_option: fd.get("correct_option"),
  };
}

export async function createGlobalQuestionAction(
  _prev: QuestionFormState,
  fd: FormData,
): Promise<QuestionFormState> {
  try {
    await requireRole("admin");
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }

  const language = parseLanguage(fd);
  if (!language) return { error: "Select a language (English or Tamil).", ok: false };

  const result = validateRow(rowFromForm(fd));
  if (!result.ok) return { error: result.errors.join(" · "), ok: false };

  try {
    await createGlobalQuestion(result.value, language);
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  revalidatePath("/admin/bank");
  return { error: null, ok: true };
}

export async function updateGlobalQuestionAction(
  _prev: QuestionFormState,
  fd: FormData,
): Promise<QuestionFormState> {
  try {
    await requireRole("admin");
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }

  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Missing question id.", ok: false };

  const language = parseLanguage(fd);
  if (!language) return { error: "Select a language (English or Tamil).", ok: false };

  const result = validateRow(rowFromForm(fd));
  if (!result.ok) return { error: result.errors.join(" · "), ok: false };

  try {
    const existing = await getGlobalQuestion(id);
    if (!existing) return { error: "Question not found in the global bank.", ok: false };
    await updateGlobalQuestion(id, result.value, language);
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  revalidatePath("/admin/bank");
  redirect("/admin/bank");
}

export async function deleteGlobalQuestionAction(
  id: string,
): Promise<{ error: string | null }> {
  try {
    await requireRole("admin");
  } catch (e) {
    return { error: (e as Error).message };
  }
  try {
    await deleteGlobalQuestion(id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/bank");
  return { error: null };
}

const CORRECT_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

/**
 * Create a diagram/image question: uploads the figure, then inserts the question
 * with an optional stem + optional option texts (blank = image-only, A/B/C/D).
 */
export async function createGlobalImageQuestionAction(
  _prev: QuestionFormState,
  fd: FormData,
): Promise<QuestionFormState> {
  try {
    await requireRole("admin");
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }

  const language = parseLanguage(fd);
  if (!language) return { error: "Select a language (English or Tamil).", ok: false };

  const subject = SUBJECTS.find((s) => s === String(fd.get("subject"))) as Subject | undefined;
  const difficulty = DIFFICULTIES.find((d) => d === String(fd.get("difficulty"))) as Difficulty | undefined;
  const chapter = String(fd.get("chapter") ?? "").trim();
  const concept = String(fd.get("concept") ?? "").trim() || chapter;
  const text = String(fd.get("question_text") ?? "").trim();
  const par = Number(String(fd.get("par_time_sec") ?? "60"));
  const correct = String(fd.get("correct_option") ?? "").toUpperCase();
  const answerIndex = CORRECT_TO_INDEX[correct];
  const options: [string, string, string, string] = [
    String(fd.get("option_a") ?? "").trim(),
    String(fd.get("option_b") ?? "").trim(),
    String(fd.get("option_c") ?? "").trim(),
    String(fd.get("option_d") ?? "").trim(),
  ];
  const file = fd.get("image");

  if (!subject || !difficulty) return { error: "Pick a subject and difficulty.", ok: false };
  if (!chapter) return { error: "Chapter is required.", ok: false };
  if (!Number.isInteger(par) || par <= 0) return { error: "Par time must be a positive whole number.", ok: false };
  if (answerIndex === undefined) return { error: "Pick the correct option (A–D).", ok: false };
  if (!(file instanceof File) || file.size === 0) return { error: "Attach a figure image.", ok: false };
  if (file.size > 5_000_000) return { error: "Image too large (max 5 MB).", ok: false };

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imageUrl = await uploadQuestionImage(bytes, file.type || "image/png");
    await createGlobalImageQuestion({
      subject, chapter, concept, difficulty, parTimeSec: par,
      text, options, answerIndex, imageUrl, language,
    });
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  revalidatePath("/admin/bank");
  return { error: null, ok: true };
}

export type ImportResult = {
  imported: number;
  total: number;
  skipped: { line: number; errors: string[] }[];
  error?: string;
};

export async function importGlobalQuestions(
  rawRows: RawRow[],
  language: "en" | "ta",
): Promise<ImportResult> {
  try {
    await requireRole("admin");
  } catch (e) {
    return { imported: 0, total: 0, skipped: [], error: (e as Error).message };
  }

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { imported: 0, total: 0, skipped: [], error: "No rows to import." };
  }
  if (rawRows.length > MAX_IMPORT_ROWS) {
    return {
      imported: 0,
      total: rawRows.length,
      skipped: [],
      error: `Too many rows (${rawRows.length}). Import up to ${MAX_IMPORT_ROWS} at a time.`,
    };
  }

  const valid: ValidQuestion[] = [];
  const skipped: { line: number; errors: string[] }[] = [];
  rawRows.forEach((raw, i) => {
    const r = validateRow(raw);
    if (r.ok) valid.push(r.value);
    else skipped.push({ line: i + 1, errors: r.errors });
  });

  let imported = 0;
  try {
    imported = await insertGlobalQuestionsBulk(valid, language);
  } catch (e) {
    return { imported: 0, total: rawRows.length, skipped, error: (e as Error).message };
  }

  revalidatePath("/admin/bank");
  return { imported, total: rawRows.length, skipped };
}

// ─────────────────────────── Un-flag (crowd-QA) ──────────────────────────────

export type UnflagResult = { error: string | null };

/**
 * Move a flagged global question to 'live' (approve) or 'rejected' (remove from
 * practice). Admin-only; question must be global (centre_id IS NULL).
 */
export async function unflagGlobalQuestionAction(
  id: string,
  resolution: "live" | "rejected",
): Promise<UnflagResult> {
  try {
    await requireRole("admin");
  } catch (e) {
    return { error: (e as Error).message };
  }
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("questions")
      .update({ status: resolution })
      .is("centre_id", null)
      .eq("id", id)
      .eq("status", "flagged");
    if (error) throw error;
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/bank");
  return { error: null };
}
