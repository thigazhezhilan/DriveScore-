/**
 * Fetches one question + glossary + knowledge chunks from DB
 * WITHOUT calling any paid APIs (no OpenAI embedding, no Claude).
 * Prints everything needed for a human (or this chat) to translate.
 *
 * Usage:
 *   npx tsx --env-file .env.local scripts/fetch-for-manual-translation.ts
 *   npx tsx --env-file .env.local scripts/fetch-for-manual-translation.ts <question-id>
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const QUESTION_ID =
  process.argv[2] ?? "e20a9814-039c-4e68-9c6f-64ee214c59a0";

// ─── Inline normalizeText (mirrors lib/tamil/glossary.ts) ────────────────────
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bions\b/g, "ion")
    .replace(/\bbonds\b/g, "bond")
    .replace(/\batoms\b/g, "atom")
    .replace(/\bmolecules\b/g, "molecule")
    .replace(/\belectrons\b/g, "electron")
    .replace(/\bprotons\b/g, "proton")
    .replace(/\bneutrons\b/g, "neutron")
    .replace(/\benzymes\b/g, "enzyme")
    .replace(/\bgenes\b/g, "gene")
    .replace(/\bcells\b/g, "cell")
    .replace(/\bwaves\b/g, "wave")
    .replace(/\bforces\b/g, "force")
    .replace(/-/g, "");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");

  const supabase = createClient(url, key);

  // ── Step 1: Fetch question ──────────────────────────────────────────────────
  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select("id, text, options, subject, chapter, difficulty")
    .eq("id", QUESTION_ID)
    .single();

  if (qErr || !q) throw new Error("Question not found: " + (qErr?.message ?? "no data"));

  const question = q as {
    id: string;
    text: string;
    options: string[];
    subject: string;
    chapter: string | null;
    difficulty: string | null;
  };

  console.log("\n══════════════════════════════════════════════");
  console.log("  STEP 1 — QUESTION");
  console.log("══════════════════════════════════════════════");
  console.log("ID       :", question.id);
  console.log("Subject  :", question.subject, "| Chapter:", question.chapter ?? "—");
  console.log("Difficulty:", question.difficulty ?? "—");
  console.log("\nQuestion Text:");
  console.log(" ", question.text);
  console.log("\nOptions:");
  (question.options ?? []).forEach((opt: string, i: number) => {
    console.log(`  ${String.fromCharCode(65 + i)}. ${opt}`);
  });

  // ── Step 2: Glossary lookup (no API) ───────────────────────────────────────
  const allText =
    question.text + " " + (question.options ?? []).join(" ");

  const { data: glossaryData, error: gErr } = await supabase
    .from("tamil_glossary")
    .select("id, english_term, tamil_term, subject")
    .or(`subject.eq.${question.subject.toLowerCase()},subject.is.null`);

  if (gErr) throw new Error("Glossary error: " + gErr.message);

  const normalizedInput = normalizeText(allText);

  type GRow = { id: string; english_term: string; tamil_term: string; subject: string | null };
  const glossaryMatches: GRow[] = (glossaryData ?? []).filter((row: GRow) => {
    const normalizedTerm = normalizeText(row.english_term);
    const re = new RegExp(
      `(?<![a-z])${normalizedTerm.replace(/\s+/g, "\\s+")}(?![a-z])`,
      "i",
    );
    return re.test(normalizedInput);
  });
  glossaryMatches.sort((a, b) => b.english_term.length - a.english_term.length);

  console.log("\n══════════════════════════════════════════════");
  console.log("  STEP 2 — GLOSSARY MATCHES (" + glossaryMatches.length + ")");
  console.log("══════════════════════════════════════════════");
  if (glossaryMatches.length === 0) {
    console.log("  (none — translate all terms freely)");
  } else {
    glossaryMatches.forEach((m) => {
      console.log(`  ${m.english_term}  →  ${m.tamil_term}  [${m.subject ?? "cross-subject"}]`);
    });
  }

  // ── Step 3: Knowledge chunks — direct filter (no embedding needed) ─────────
  const subjectLower = question.subject.toLowerCase();

  let chunks: Record<string, unknown>[] = [];

  // Try chapter-specific first
  if (question.chapter) {
    const { data: cd } = await supabase
      .from("tamil_knowledge_chunks")
      .select("id, source_type, subject, chapter, tamil_text, english_reference")
      .eq("subject", subjectLower)
      .eq("chapter", question.chapter)
      .limit(5);
    chunks = (cd as Record<string, unknown>[]) ?? [];
  }

  // Fall back to subject-wide if < 2 chapter-specific chunks
  if (chunks.length < 2) {
    const { data: sd } = await supabase
      .from("tamil_knowledge_chunks")
      .select("id, source_type, subject, chapter, tamil_text, english_reference")
      .eq("subject", subjectLower)
      .limit(5);
    chunks = (sd as Record<string, unknown>[]) ?? [];
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  STEP 3 — KNOWLEDGE CHUNKS (" + chunks.length + ")");
  console.log("══════════════════════════════════════════════");
  if (chunks.length === 0) {
    console.log("  (none — translate from first principles)");
  } else {
    chunks.forEach((c, i) => {
      const text = c.tamil_text as string;
      console.log(`\n  [${i + 1}] Chapter: ${(c.chapter as string) ?? "general"} | Source: ${c.source_type}`);
      console.log("  Tamil :", text.length > 250 ? text.slice(0, 250) + "…" : text);
      if (c.english_reference) {
        const ref = c.english_reference as string;
        console.log("  Ref   :", ref.length > 150 ? ref.slice(0, 150) + "…" : ref);
      }
    });
  }

  // ── JSON block for store script ────────────────────────────────────────────
  const jsonData = {
    questionId: question.id,
    question_text: question.text,
    options: question.options,
    subject: question.subject,
    glossaryMatches: glossaryMatches.map((m) => ({
      id: m.id,
      english_term: m.english_term,
      tamil_term: m.tamil_term,
      subject: m.subject,
    })),
    retrievedChunks: chunks.map((c) => ({
      id: c.id as string,
      source_type: c.source_type as string,
      subject: c.subject as string,
      chapter: (c.chapter as string | null) ?? null,
      tamil_text: c.tamil_text as string,
      english_reference: (c.english_reference as string | null) ?? null,
      similarity: 0,
    })),
  };

  console.log("\n══════════════════════════════════════════════");
  console.log("  PIPELINE DATA (for store script)");
  console.log("══════════════════════════════════════════════");
  console.log(JSON.stringify(jsonData, null, 2));
  console.log("\n✓ Done. Now translate the question above and run store-manual-translation.ts");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
