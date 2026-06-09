"use server";

/**
 * Question-bank server actions — now for the TEACHER role (centre manager).
 *
 * Guarded by `requireRole("teacher")`; `centre_id` always from the session.
 * Both the single-add form and the CSV import RE-VALIDATE through the shared
 * `validateRow` before anything is written.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  insertQuestionsBulk,
  updateQuestion,
} from "@/lib/db/questions";
import { validateRow, type RawRow, type ValidQuestion } from "@/lib/questions/validate";

export type QuestionFormState = { error: string | null; ok: boolean };

const MAX_IMPORT_ROWS = 2000;

async function teacherCentreId(): Promise<string> {
  const me = await requireRole("teacher");
  if (!me.profile.centreId) {
    throw new Error("Your account isn't linked to a centre.");
  }
  return me.profile.centreId;
}

/** Build a RawRow from the single-question form (mirrors the CSV columns). */
function rowFromForm(fd: FormData): RawRow {
  return {
    subject: fd.get("subject"),
    chapter: fd.get("chapter"),
    concept: fd.get("concept"),
    difficulty: fd.get("difficulty"),
    par_time_sec: fd.get("par_time_sec"),
    question_text: fd.get("question_text"),
    option_a: fd.get("option_a"),
    option_b: fd.get("option_b"),
    option_c: fd.get("option_c"),
    option_d: fd.get("option_d"),
    correct_option: fd.get("correct_option"),
  };
}

export async function createQuestionAction(
  _prev: QuestionFormState,
  fd: FormData,
): Promise<QuestionFormState> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }

  const result = validateRow(rowFromForm(fd));
  if (!result.ok) return { error: result.errors.join(" · "), ok: false };

  try {
    await createQuestion(centreId, result.value);
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  revalidatePath("/teacher/questions");
  return { error: null, ok: true };
}

export async function updateQuestionAction(
  _prev: QuestionFormState,
  fd: FormData,
): Promise<QuestionFormState> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }

  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Missing question id.", ok: false };

  const result = validateRow(rowFromForm(fd));
  if (!result.ok) return { error: result.errors.join(" · "), ok: false };

  try {
    const existing = await getQuestion(centreId, id);
    if (!existing) return { error: "Question not found in your bank.", ok: false };
    await updateQuestion(centreId, id, result.value);
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  revalidatePath("/teacher/questions");
  redirect("/teacher/questions");
}

export async function deleteQuestionAction(
  id: string,
): Promise<{ error: string | null }> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
  } catch (e) {
    return { error: (e as Error).message };
  }
  try {
    await deleteQuestion(centreId, id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/teacher/questions");
  return { error: null };
}

export type ImportResult = {
  imported: number;
  total: number;
  skipped: { line: number; errors: string[] }[];
  error?: string;
};

export async function importQuestions(rawRows: RawRow[]): Promise<ImportResult> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
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
    imported = await insertQuestionsBulk(centreId, valid);
  } catch (e) {
    return { imported: 0, total: rawRows.length, skipped, error: (e as Error).message };
  }

  revalidatePath("/teacher/questions");
  return { imported, total: rawRows.length, skipped };
}
