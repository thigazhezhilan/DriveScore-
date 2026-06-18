/**
 * STEP 1 of the chat-AI pipeline.
 *
 * Fetches one or more untranslated questions + glossary + knowledge chunks from
 * the DB (no OpenAI or Anthropic API call). Prints all data needed for the chat
 * AI to produce a Tamil translation, then writes .translation-queue.json so the
 * AI can fill in the translation field and hand off to pipeline-chat-store.ts.
 *
 * Usage (all filters optional; default = 1 untranslated question):
 *   npm run translate:fetch
 *   npm run translate:fetch -- --id <uuid>
 *   npm run translate:fetch -- --subject Physics --limit 5
 *   npm run translate:fetch -- --subject Biology --status none --limit 10
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";

const QUEUE_FILE = resolve(process.cwd(), ".translation-queue.json");

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

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] ?? null : null;
}

async function lookupGlossary(
  supabase: ReturnType<typeof createClient>,
  allText: string,
  subject: string,
) {
  const { data, error } = await supabase
    .from("tamil_glossary")
    .select("id, english_term, tamil_term, subject")
    .or(`subject.eq.${subject.toLowerCase()},subject.is.null`);

  if (error || !data) return [];

  const normalizedInput = normalizeText(allText);
  type GRow = { id: string; english_term: string; tamil_term: string; subject: string | null };

  const matches: GRow[] = (data as GRow[]).filter((row) => {
    const norm = normalizeText(row.english_term);
    const re = new RegExp(`(?<![a-z])${norm.replace(/\s+/g, "\\s+")}(?![a-z])`, "i");
    return re.test(normalizedInput);
  });
  matches.sort((a, b) => b.english_term.length - a.english_term.length);
  return matches;
}

async function lookupChunks(
  supabase: ReturnType<typeof createClient>,
  subject: string,
  chapter: string | null,
) {
  // Try chapter-specific first (no embedding — direct filter)
  if (chapter) {
    const { data: cd } = await supabase
      .from("tamil_knowledge_chunks")
      .select("id, source_type, subject, chapter, tamil_text, english_reference")
      .eq("subject", subject.toLowerCase())
      .eq("chapter", chapter)
      .limit(5);
    if (cd && cd.length >= 2)
      return (cd as Record<string, unknown>[]).map((c) => ({ ...c, similarity: 0 }));
  }
  // Fall back to subject-wide
  const { data: sd } = await supabase
    .from("tamil_knowledge_chunks")
    .select("id, source_type, subject, chapter, tamil_text, english_reference")
    .eq("subject", subject.toLowerCase())
    .limit(5);
  return ((sd ?? []) as Record<string, unknown>[]).map((c) => ({ ...c, similarity: 0 }));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key);

  // ── Parse args ───────────────────────────────────────────────────────────────
  const id      = getArg("--id");
  const subject = getArg("--subject");
  const status  = getArg("--status") ?? "none";
  const limit   = parseInt(getArg("--limit") ?? "1", 10);

  // ── Fetch questions ──────────────────────────────────────────────────────────
  type QRow = { id: string; body_en: string; options_en: string[]; subject: string; chapter: string | null; difficulty: string | null };
  let questions: QRow[] = [];

  if (id) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, body_en, options_en, subject, chapter, difficulty")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("Question not found: " + (error?.message ?? ""));
    questions = [data as QRow];
  } else {
    let q = supabase
      .from("questions")
      .select("id, body_en, options_en, subject, chapter, difficulty")
      .eq("tamil_status", status);
    if (subject) q = q.eq("subject", subject);
    const { data, error } = await q.limit(limit);
    if (error) throw new Error("Fetch failed: " + error.message);
    questions = (data ?? []) as QRow[];
  }

  if (questions.length === 0) {
    console.log(`No questions found with status="${status}"${subject ? ` subject="${subject}"` : ""}.`);
    return;
  }

  // ── Build queue items ────────────────────────────────────────────────────────
  type QueueItem = {
    questionId: string;
    question_text: string;
    options: string[];
    subject: string;
    chapter: string | null;
    glossaryMatches: unknown[];
    retrievedChunks: unknown[];
    translation: null;
  };

  const queue: QueueItem[] = [];

  console.log(`\n${"═".repeat(54)}`);
  console.log(`  TAMIL TRANSLATION QUEUE — ${questions.length} question(s)`);
  console.log(`${"═".repeat(54)}`);

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    const allText = q.body_en + " " + (q.options_en ?? []).join(" ");

    const glossaryMatches = await lookupGlossary(supabase, allText, q.subject);
    const retrievedChunks = await lookupChunks(supabase, q.subject, q.chapter);

    console.log(`\n── [${idx + 1}/${questions.length}] ─────────────────────────────────────`);
    console.log(`ID       : ${q.id}`);
    console.log(`Subject  : ${q.subject}  |  Chapter: ${q.chapter ?? "—"}  |  Difficulty: ${q.difficulty ?? "—"}`);
    console.log(`\nQuestion : ${q.body_en}`);
    console.log(`\nOptions  :`);
    (q.options_en ?? []).forEach((opt, i) => console.log(`  ${String.fromCharCode(65 + i)}. ${opt}`));

    console.log(`\nGlossary matches (${glossaryMatches.length}):`);
    if (glossaryMatches.length === 0) {
      console.log("  (none — translate all terms freely)");
    } else {
      (glossaryMatches as { english_term: string; tamil_term: string; subject: string | null }[])
        .forEach((m) => console.log(`  ${m.english_term}  →  ${m.tamil_term}  [${m.subject ?? "cross"}]`));
    }

    console.log(`\nKnowledge chunks (${retrievedChunks.length}):`);
    if (retrievedChunks.length === 0) {
      console.log("  (none — translate from first principles)");
    } else {
      retrievedChunks.forEach((c, i) => {
        const text = (c as { tamil_text: string }).tamil_text;
        console.log(`  [${i + 1}] ${(c as { chapter: string | null }).chapter ?? "general"}: ${text.slice(0, 120)}…`);
      });
    }

    queue.push({
      questionId:       q.id,
      question_text:    q.body_en,
      options:          q.options_en ?? [],
      subject:          q.subject,
      chapter:          q.chapter,
      glossaryMatches,
      retrievedChunks,
      translation:      null,
    });
  }

  // ── Write queue file ─────────────────────────────────────────────────────────
  const output = {
    created_at: new Date().toISOString(),
    count: queue.length,
    items: queue,
  };
  writeFileSync(QUEUE_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n${"═".repeat(54)}`);
  console.log(`✓ Queue written → .translation-queue.json`);
  console.log(`\nNow the chat AI will:`);
  console.log(`  1. Read the question(s) above`);
  console.log(`  2. Produce Tamil translation(s) in the chat`);
  console.log(`  3. Write the translation into .translation-queue.json`);
  console.log(`  4. Run: npm run translate:store`);
  console.log(`${"═".repeat(54)}\n`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
