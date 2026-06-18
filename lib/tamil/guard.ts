// Pure guard function — no DB, no API. Enforces the rule:
//   Tamil content is served to a student ONLY when:
//     - bodyTa is non-null  AND
//     - the student's preferred_language === 'ta'
// In all other cases, fall back to English silently.
//
// This is the single source of truth for this decision.
// Enforce in the query layer AND here — defence in depth.

export type TamilStatus =
  | "none"
  | "ai_drafted"
  | "review_required"
  | "review_pending"
  | "approved"
  | "rejected";

export type QuestionWithTamil = {
  text: string;
  options: string[];
  explanation?: string | null;
  bodyTa?: string | null;
  optionsTa?: string[] | null;
  explanationTa?: string | null;
  tamilStatus?: TamilStatus | string | null;
};

export type StudentLocale = "en" | "ta";

export type LocalisedQuestion = {
  text: string;
  options: string[];
  explanation: string | null;
  locale: StudentLocale;
};

// Returns the Tamil version of a question iff Tamil content exists and
// the student's locale is 'ta'. Falls back to English for any other combination.
export function getTamilContent(
  question: QuestionWithTamil,
  studentLocale: StudentLocale,
): LocalisedQuestion {
  if (
    studentLocale === "ta" &&
    question.bodyTa &&
    Array.isArray(question.optionsTa) &&
    question.optionsTa.length === 4
  ) {
    return {
      text:        question.bodyTa,
      options:     question.optionsTa,
      explanation: question.explanationTa ?? null,
      locale:      "ta",
    };
  }

  // Fallback to English
  return {
    text:        question.text,
    options:     question.options,
    explanation: question.explanation ?? null,
    locale:      "en",
  };
}
