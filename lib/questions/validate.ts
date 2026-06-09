/**
 * Question validation + CSV-row mapping — a PURE module (no React, no DB, no
 * browser/server globals) so the exact same rules run in two places:
 *   - the client, to build the CSV import PREVIEW with per-row errors, and
 *   - the server action, to RE-VALIDATE before insert (never trust the client).
 *
 * `centre_id` is intentionally NOT part of this — it is always set server-side
 * from the logged-in admin's session.
 */

import type { Difficulty, Subject } from "@/lib/types";

export const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

/** Canonical CSV columns, in order. */
export const CSV_COLUMNS = [
  "subject",
  "chapter",
  "concept",
  "difficulty",
  "par_time_sec",
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
] as const;

/** A validated, insert-ready question (centre_id added later, server-side). */
export type ValidQuestion = {
  subject: Subject;
  chapter: string;
  concept: string;
  difficulty: Difficulty;
  parTimeSec: number;
  text: string;
  options: [string, string, string, string];
  answerIndex: number; // 0..3
};

/** A raw, untrusted row (from a CSV parse or a form). */
export type RawRow = Record<string, unknown>;

export type RowResult =
  | { ok: true; value: ValidQuestion }
  | { ok: false; errors: string[] };

const CORRECT_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Validate one raw row and, if valid, map it to an insert-ready question. */
export function validateRow(raw: RawRow): RowResult {
  const errors: string[] = [];

  const subjectIn = str(raw.subject);
  const chapter = str(raw.chapter);
  const concept = str(raw.concept);
  const difficultyIn = str(raw.difficulty);
  const parIn = str(raw.par_time_sec);
  const text = str(raw.question_text);
  const a = str(raw.option_a);
  const b = str(raw.option_b);
  const c = str(raw.option_c);
  const d = str(raw.option_d);
  const correctIn = str(raw.correct_option).toUpperCase();

  // Case-insensitive match against the allowed enums.
  const subject = SUBJECTS.find((s) => s.toLowerCase() === subjectIn.toLowerCase());
  if (!subject) errors.push(`subject must be one of ${SUBJECTS.join(", ")}`);

  const difficulty = DIFFICULTIES.find((s) => s.toLowerCase() === difficultyIn.toLowerCase());
  if (!difficulty) errors.push(`difficulty must be one of ${DIFFICULTIES.join(", ")}`);

  if (!chapter) errors.push("chapter is required");
  if (!concept) errors.push("concept is required");
  if (!text) errors.push("question_text is required");
  if (!a) errors.push("option_a is required");
  if (!b) errors.push("option_b is required");
  if (!c) errors.push("option_c is required");
  if (!d) errors.push("option_d is required");

  const par = Number(parIn);
  if (!parIn || !Number.isInteger(par) || par <= 0) {
    errors.push("par_time_sec must be a positive whole number");
  }

  const answerIndex = CORRECT_TO_INDEX[correctIn];
  if (answerIndex === undefined) errors.push("correct_option must be A, B, C or D");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      subject: subject!,
      chapter,
      concept,
      difficulty: difficulty!,
      parTimeSec: par,
      text,
      options: [a, b, c, d],
      answerIndex: answerIndex!,
    },
  };
}

/** Letter (A–D) for an answer index, for display + edit prefill. */
export function indexToLetter(i: number): string {
  return ["A", "B", "C", "D"][i] ?? "?";
}

/** Quote a CSV field if it contains a comma, quote or newline. */
function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A ready-to-fill CSV template (header + one worked example row). */
export function csvTemplate(): string {
  const sample = [
    "Physics",
    "Ray Optics",
    "Image formation by concave mirror",
    "Medium",
    "60",
    "An object is placed 30 cm from a concave mirror of focal length 20 cm. Where is the image?",
    "30 cm in front",
    "60 cm in front",
    "20 cm behind",
    "At infinity",
    "B",
  ];
  return [CSV_COLUMNS.join(","), sample.map(csvField).join(",")].join("\n") + "\n";
}
