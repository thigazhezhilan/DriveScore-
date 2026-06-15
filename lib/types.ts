/**
 * Shared domain types for DriveScore.
 *
 * These mirror the spec exactly so the seed data, the test session and the
 * Diagnosis Engine all speak the same language.
 */

export type Subject = "Physics" | "Chemistry" | "Biology";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Question = {
  id: string;
  subject: Subject;
  /** NCERT chapter name, e.g. "Ray Optics" */
  chapter: string;
  /** Finer concept tag, e.g. "Concave mirror image formation" */
  concept: string;
  difficulty: Difficulty;
  /** Expected time for an average student, in seconds. */
  parTimeSec: number;
  text: string;
  /** Exactly 4 options. May be blank strings for image-only questions. */
  options: string[];
  /** Index (0–3) of the correct option. */
  answerIndex: number;
  /** Optional figure for diagram questions (public URL). */
  imageUrl?: string | null;
};

/**
 * A question as sent to the BROWSER — without `answerIndex`. The correct
 * answer must never reach the client; grading happens server-side.
 */
export type PublicQuestion = Omit<Question, "answerIndex">;

export type Attempt = {
  questionId: string;
  /** null = unattempted / left blank. */
  pickedIndex: number | null;
  /** Seconds the student spent on this question. */
  timeSec: number;
  /**
   * The FIRST option the student touched on this question, before any changes.
   * Captured client-side and persisted server-side; null when the question was
   * never touched or for older attempts saved before this was tracked. Used
   * ONLY for the SELF_DOUBT diagnosis — grading always uses `pickedIndex`.
   */
  firstPickedIndex?: number | null;
};

/** The diagnosis buckets produced by the engine. */
export type DiagnosisCategory =
  | "CONCEPT_GAP"
  | "GUESS"
  | "CARELESS"
  | "TOO_SLOW"
  | "TIME_MANAGEMENT"
  /**
   * Had the correct answer first, then changed it to a wrong one. Only ever
   * produced when first-answer data exists; older attempts fall back to the
   * classic categories above.
   */
  | "SELF_DOUBT"
  | "SOLID";

/**
 * A single diagnosis enriched with a confidence score. `diagnose()` returns the
 * bare category (unchanged); `diagnoseDetailed()` returns this.
 */
export type DiagnosisResult = {
  category: DiagnosisCategory;
  /** 0–100: how strongly the signals point to this category vs. the runner-up. */
  confidence: number;
  /** One-line, human-readable justification for the confidence. */
  confidenceReason: string;
};

/** Whole-attempt pacing personality, derived from timing + correctness. */
export type SpeedArchetype = "SNIPER" | "GAMBLER" | "BALANCED" | "PANICKER";

export type Role = "student" | "teacher" | "parent";
