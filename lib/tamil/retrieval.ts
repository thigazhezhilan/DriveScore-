import { getServiceClient } from "@/lib/db/client";
import { EXCLUDE_AI_SEEDS } from "./validation-config";

export type KnowledgeChunk = {
  id: string;
  source_type: string;
  subject: string;
  chapter: string | null;
  tamil_text: string;
  english_reference: string | null;
  similarity: number;
};

export async function retrieveTamilContext(
  embedding: number[],
  subject: string,
  chapter?: string,
  topK = 5,
): Promise<KnowledgeChunk[]> {
  const supabase = getServiceClient();
  const subjectLower = subject.toLowerCase();

  // Smart seed exclusion: check whether any non-seed chunks exist for this subject.
  const { count } = await supabase
    .from("tamil_knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("subject", subjectLower)
    .neq("source_type", "ai_generated_seed");

  const realContentExists = (count ?? 0) > 0;
  const excludeSeeds = EXCLUDE_AI_SEEDS || realContentExists;

  // Build the pgvector similarity query via RPC.
  // match_tamil_chunks is a SQL function defined below — falls back to
  // manual filter if the RPC isn't available (allows cold-start without migration).
  const embeddingStr = `[${embedding.join(",")}]`;

  let query = supabase
    .from("tamil_knowledge_chunks")
    .select("id, source_type, subject, chapter, tamil_text, english_reference")
    .eq("subject", subjectLower)
    .order("embedding <=> '" + embeddingStr + "'")
    .limit(topK);

  if (excludeSeeds) {
    query = query.neq("source_type", "ai_generated_seed");
  }
  if (chapter) {
    // Prefer chapter-specific chunks; fall back to subject-level if too few.
    const chapterQuery = query.eq("chapter", chapter);
    const { data: chapterData, error: cErr } = await chapterQuery;
    if (!cErr && chapterData && chapterData.length >= 2) {
      return formatChunks(chapterData, embedding);
    }
    // Fall through to subject-wide query (chapter filter dropped)
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[Tamil RAG] Retrieval error:", error.message);
    return [];
  }
  if (!data || data.length === 0) {
    console.warn("[Tamil RAG] No chunks found for subject:", subjectLower);
    return [];
  }

  return formatChunks(data, embedding);
}

function formatChunks(
  rows: Record<string, unknown>[],
  _embedding: number[],
): KnowledgeChunk[] {
  return rows.map((r) => ({
    id: r.id as string,
    source_type: r.source_type as string,
    subject: r.subject as string,
    chapter: (r.chapter as string | null) ?? null,
    tamil_text: r.tamil_text as string,
    english_reference: (r.english_reference as string | null) ?? null,
    similarity: 0, // pgvector returns rows in similarity order; exact score not exposed via select
  }));
}
