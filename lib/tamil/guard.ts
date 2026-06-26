// Pure guard function — no DB, no API.
//
// With migration 0020, each question row carries exactly one language
// (body/options in the student's locked language, set at query time via
// language=locale filter). This function is now a thin pass-through kept
// for call-site compatibility; the bilingual switching logic is gone.

export type QuestionWithTamil = {
  text: string;
  options: string[];
  explanation?: string | null;
};

export type StudentLocale = "en" | "ta";

export type LocalisedQuestion = {
  text: string;
  options: string[];
  explanation: string | null;
  locale: StudentLocale;
};

// Returns the question's text and options directly — content is already in
// the student's language because the DB query filters by language=locale.
export function getTamilContent(
  question: QuestionWithTamil,
  studentLocale: StudentLocale,
): LocalisedQuestion {
  return {
    text:        question.text,
    options:     question.options,
    explanation: question.explanation ?? null,
    locale:      studentLocale,
  };
}
