import { getServiceClient } from "@/lib/db/client";
import { generateEmbedding } from "./embed";
import { lookupGlossaryTerms } from "./glossary";
import { retrieveTamilContext } from "./retrieval";
import { translateQuestion } from "./translate";
import { validateTranslation } from "./validate";
import { storeTamilDraft, storeTamilError } from "./store";

// ─── Public types ──────────────────────────────────────────────────────────────

export type TranslationSummary = {
  questionId: string;
  status: "ai_drafted" | "review_required" | "error" | "skipped";
  score: number | null;
  failedChecks: string[];
  criticalFailures: string[];
  errorMessage?: string;
};

export type BatchFilter = {
  subject?: string;
  tamil_status?: string;
  limit?: number;
  ids?: string[];
};

export type BatchSummary = {
  total: number;
  ai_drafted: number;
  review_required: number;
  failed_skipped: number;
  avg_score_drafted: number | null;
  avg_score_review: number | null;
  most_common_failure: string | null;
  results: TranslationSummary[];
};

type QuestionRow = {
  id: string;
  subject: string;
  chapter: string;
  text: string;
  options: string[];
  answer_index: number;
  explanation?: string | null;
};

// ─── Single question ───────────────────────────────────────────────────────────

export async function translateQuestionById(
  questionId: string,
): Promise<TranslationSummary> {
  const supabase = getServiceClient();

  // Step 1 — Load the English question (answer_index never enters the prompt)
  const { data: qData, error: qErr } = await supabase
    .from("questions")
    .select("id, subject, chapter, text, options, explanation")
    .eq("id", questionId)
    .single();

  if (qErr || !qData) {
    return {
      questionId,
      status: "error",
      score: null,
      failedChecks: [],
      criticalFailures: [],
      errorMessage: `Question not found: ${qErr?.message ?? "no data"}`,
    };
  }

  const q = qData as unknown as QuestionRow;

  try {
    // Step 2 — Embed the English question
    const embedding = await generateEmbedding(q.text);

    // Step 3 — Retrieve Tamil context
    const retrievedChunks = await retrieveTamilContext(embedding, q.subject, q.chapter);
    if (retrievedChunks.length === 0) {
      console.warn(`[Tamil Agent] No knowledge chunks for question ${questionId} (${q.subject}/${q.chapter}). Proceeding without context.`);
    }

    // Step 4 — Glossary lookup
    const glossaryMatches = await lookupGlossaryTerms(q.text, q.subject);

    // Step 5 — Translate with Claude
    const draft = await translateQuestion({
      question_text:   q.text,
      options:         q.options as string[],
      explanation:     q.explanation ?? "",
      subject:         q.subject,
      glossaryMatches,
      retrievedChunks,
    });

    // Step 6 — Objective validation
    const validation = validateTranslation(
      { question_text: q.text, options: q.options as string[] },
      draft,
      glossaryMatches,
      retrievedChunks,
    );

    // Step 7 — Store
    await storeTamilDraft({
      questionId,
      draft,
      validation,
      glossaryMatches,
      retrievedChunks,
    });

    const criticalFailures: string[] = [];
    if (!validation.checks.risk_words_preserved) {
      criticalFailures.push("risk_words_preserved missing");
    }

    return {
      questionId,
      status: validation.auto_review_required ? "review_required" : "ai_drafted",
      score:  validation.score,
      failedChecks: validation.failed_checks,
      criticalFailures,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Tamil Agent] Error translating ${questionId}:`, msg);
    try {
      await storeTamilError(questionId, msg);
    } catch {
      // storage failure on top of translation failure — just log
      console.error(`[Tamil Agent] Could not store error for ${questionId}`);
    }
    return {
      questionId,
      status: "error",
      score: null,
      failedChecks: [],
      criticalFailures: [],
      errorMessage: msg,
    };
  }
}

// ─── Batch mode ────────────────────────────────────────────────────────────────

export async function translateBatch(filter: BatchFilter = {}): Promise<BatchSummary> {
  const supabase = getServiceClient();
  const limit = filter.limit ?? 50;

  let idsToProcess: string[];

  if (filter.ids && filter.ids.length > 0) {
    idsToProcess = filter.ids;
  } else {
    let query = supabase
      .from("questions")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (filter.subject) query = query.eq("subject", filter.subject);
    if (filter.tamil_status) query = query.eq("tamil_status", filter.tamil_status);

    const { data, error } = await query;
    if (error) throw error;
    idsToProcess = (data ?? []).map((r: { id: string }) => r.id);
  }

  const results: TranslationSummary[] = [];
  let draftedScores: number[]  = [];
  let reviewScores:  number[]  = [];
  const failureCounts: Record<string, number> = {};

  console.log(`[Tamil Agent] Batch starting: ${idsToProcess.length} questions`);

  for (let i = 0; i < idsToProcess.length; i++) {
    const id = idsToProcess[i];
    process.stdout.write(`  [${i + 1}/${idsToProcess.length}] ${id} ... `);

    const result = await translateQuestionById(id);
    results.push(result);

    if (result.status === "ai_drafted") {
      if (result.score !== null) draftedScores.push(result.score);
      process.stdout.write(`✅ ai_drafted (score: ${result.score})\n`);
    } else if (result.status === "review_required") {
      if (result.score !== null) reviewScores.push(result.score);
      process.stdout.write(`⚠️  review_required (score: ${result.score}, failed: ${result.failedChecks.join(", ")})\n`);
      for (const fc of result.failedChecks) {
        failureCounts[fc] = (failureCounts[fc] ?? 0) + 1;
      }
    } else {
      process.stdout.write(`❌ ${result.status} — ${result.errorMessage ?? ""}\n`);
    }
  }

  const ai_drafted      = results.filter((r) => r.status === "ai_drafted").length;
  const review_required = results.filter((r) => r.status === "review_required").length;
  const failed_skipped  = results.filter((r) => r.status === "error" || r.status === "skipped").length;

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const topFailure = Object.entries(failureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const summary: BatchSummary = {
    total: idsToProcess.length,
    ai_drafted,
    review_required,
    failed_skipped,
    avg_score_drafted: avg(draftedScores),
    avg_score_review:  avg(reviewScores),
    most_common_failure: topFailure,
    results,
  };

  console.log(`
Batch complete: ${summary.total} questions
✅ ai_drafted:      ${summary.ai_drafted} (avg score: ${summary.avg_score_drafted ?? "—"})
⚠️  review_required: ${summary.review_required} (avg score: ${summary.avg_score_review ?? "—"})
❌ failed/skipped:   ${summary.failed_skipped}
${topFailure ? `Most common failure: ${topFailure} (${failureCounts[topFailure]} questions)` : "No failures recorded."}
`);

  return summary;
}
