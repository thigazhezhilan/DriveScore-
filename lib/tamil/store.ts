import { getServiceClient } from "@/lib/db/client";
import type { TranslationOutput } from "./translate";
import type { ValidationResult } from "./validate";
import type { GlossaryMatch } from "./glossary";
import type { KnowledgeChunk } from "./retrieval";

export async function storeTamilDraft(params: {
  questionId: string;
  draft: TranslationOutput;
  validation: ValidationResult;
  glossaryMatches: GlossaryMatch[];
  retrievedChunks: KnowledgeChunk[];
  errorLog?: string | null;
}): Promise<void> {
  const { questionId, draft, validation, glossaryMatches, retrievedChunks, errorLog } = params;

  const tamilStatus = validation.auto_review_required ? "review_required" : "ai_drafted";

  const validationResult = {
    score:                validation.score,
    auto_review_required: validation.auto_review_required,
    failed_checks:        validation.failed_checks,
    checks:               validation.checks,
    retrieved_chunk_ids:  retrievedChunks.map((c) => c.id),
    glossary_match_ids:   glossaryMatches.map((m) => m.id),
  };

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("questions")
    .update({
      tamil_question_text:     draft.tamil_question_text,
      tamil_options:           draft.tamil_options,
      tamil_explanation:       draft.tamil_explanation,
      tamil_status:            tamilStatus,
      tamil_confidence_notes:  draft.model_observations,
      tamil_validation_result: validationResult,
      tamil_error_log:         errorLog ?? null,
      tamil_drafted_at:        new Date().toISOString(),
    })
    .eq("id", questionId);

  if (error) throw error;
}

// Store a failure (parse error / API error) without corrupting Tamil fields
export async function storeTamilError(questionId: string, errorLog: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("questions")
    .update({
      tamil_status:    "none",
      tamil_error_log: errorLog,
      tamil_drafted_at: new Date().toISOString(),
    })
    .eq("id", questionId);
  if (error) throw error;
}
