/**
 * End-to-end pipeline verification for one question.
 * Prints every step so you can visually inspect the Tamil output.
 *
 * Usage:
 *   npx tsx scripts/verify-tamil-pipeline.ts                  # first question with tamil_status='none'
 *   npx tsx scripts/verify-tamil-pipeline.ts --id <uuid>      # specific question
 *   npx tsx scripts/verify-tamil-pipeline.ts --subject Physics # first Physics question
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                      OPENAI_API_KEY, ANTHROPIC_API_KEY
 *
 * Self-contained — does NOT import server-only modules.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ── Config ────────────────────────────────────────────────────────────────────

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OAI_KEY = process.env.OPENAI_API_KEY!;
const ANT_KEY = process.env.ANTHROPIC_API_KEY!;

[["NEXT_PUBLIC_SUPABASE_URL", SB_URL], ["SUPABASE_SERVICE_ROLE_KEY", SB_KEY],
 ["OPENAI_API_KEY", OAI_KEY], ["ANTHROPIC_API_KEY", ANT_KEY]]
  .filter(([, v]) => !v)
  .forEach(([k]) => { console.error(`Missing ${k} in .env.local`); process.exit(1); });

const sb  = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
const oai = new OpenAI({ apiKey: OAI_KEY });
const ant = new Anthropic({ apiKey: ANT_KEY });

// Import only pure functions — validation-config and validate have no server-only deps.
// normalizeText is inlined here to avoid pulling in glossary.ts → lib/db/client.ts → server-only.
import { validateTranslation } from "../lib/tamil/validate";
import {
  TAMIL_NEGATION_MARKERS,
  PRESERVED_UNITS,
  PRESERVED_CHEMICAL_FORMULAS,
} from "../lib/tamil/validation-config";

function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\bions\b/g, "ion").replace(/\bbonds\b/g, "bond")
    .replace(/\batoms\b/g, "atom").replace(/\bmolecules\b/g, "molecule")
    .replace(/\belectrons\b/g, "electron").replace(/\bprotons\b/g, "proton")
    .replace(/\benzymes\b/g, "enzyme").replace(/\bgenes\b/g, "gene")
    .replace(/\bcells\b/g, "cell").replace(/\bwaves\b/g, "wave")
    .replace(/\bforces\b/g, "force").replace(/-/g, "");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((a, i, arr) => {
    if (a.startsWith("--")) args[a.slice(2)] = arr[i + 1] ?? "true";
  });
  return args;
}

function hr(label: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("─".repeat(60));
}

function printBilingual(english: string, tamil: string) {
  console.log(`  EN: ${english}`);
  console.log(`  TA: ${tamil}`);
}

// ── Step 1: Load question ─────────────────────────────────────────────────────

async function loadQuestion(args: Record<string, string>) {
  let query = sb.from("questions")
    .select("id, subject, chapter, concept, difficulty, text, options, tamil_status")
    .limit(1);

  if (args.id)      query = query.eq("id", args.id);
  else if (args.subject) query = query.eq("subject", args.subject).eq("tamil_status", "none");
  else              query = query.eq("tamil_status", "none");

  const { data, error } = await query.single();
  if (error || !data) throw new Error(`Question not found: ${error?.message}`);
  return data as {
    id: string; subject: string; chapter: string; concept: string;
    difficulty: string; text: string; options: string[];
    tamil_status: string;
  };
}

// ── Step 2: Embed ─────────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const res = await oai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " ").trim(),
    dimensions: 1536,
  });
  return res.data[0].embedding;
}

// ── Step 3: Retrieve context ──────────────────────────────────────────────────

async function retrieveContext(embedding: number[], subject: string, chapter: string) {
  const embStr = `[${embedding.join(",")}]`;

  // Check if non-seed content exists
  const { count } = await sb.from("tamil_knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("subject", subject.toLowerCase())
    .neq("source_type", "ai_generated_seed");

  const excludeSeeds = (count ?? 0) > 0;

  let q = sb.from("tamil_knowledge_chunks")
    .select("id, source_type, chapter, tamil_text, english_reference")
    .eq("subject", subject.toLowerCase())
    .order(`embedding <=> '${embStr}'`)
    .limit(5);

  if (excludeSeeds) q = q.neq("source_type", "ai_generated_seed");

  const { data } = await q;
  return data ?? [];
}

// ── Step 4: Glossary lookup ───────────────────────────────────────────────────

async function lookupGlossary(text: string, subject: string) {
  const { data } = await sb.from("tamil_glossary")
    .select("id, english_term, tamil_term, subject")
    .or(`subject.eq.${subject.toLowerCase()},subject.is.null`);

  if (!data) return [];

  const normalized = normalizeText(text);
  return (data as { id: string; english_term: string; tamil_term: string; subject: string }[])
    .filter((row) => {
      const t = normalizeText(row.english_term);
      return new RegExp(`(?<![a-z])${t.replace(/\s+/g, "\\s+")}(?![a-z])`, "i").test(normalized);
    })
    .sort((a, b) => b.english_term.length - a.english_term.length);
}

// ── Step 5: Translate ─────────────────────────────────────────────────────────

async function translate(q: Awaited<ReturnType<typeof loadQuestion>>,
                         glossary: Awaited<ReturnType<typeof lookupGlossary>>,
                         chunks: Awaited<ReturnType<typeof retrieveContext>>) {
  const glossaryBlock = glossary.length
    ? glossary.map((m) => `  ${m.english_term} → ${m.tamil_term}`).join("\n")
    : "  (no glossary matches)";

  const contextBlock = chunks.length
    ? chunks.map((c, i) => `[${i + 1}] ${c.tamil_text}`).join("\n\n")
    : "(no reference material — translate from first principles)";

  const options = (q.options as string[]).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n");

  const system = `You are an expert English-to-Tamil translator specialising in NEET exam content for Tamil Nadu students.

RULES:
1. Translate MEANING, not words. The Tamil must convey exactly the same thing as the English, phrased the way a Tamil-medium ${q.subject} student would naturally read it.

2. MANDATORY GLOSSARY — use these exact Tamil terms wherever the English term appears:
${glossaryBlock}

3. REFERENCE MATERIAL — use these Tamil passages as your guide for terminology and register:
${contextBlock}

4. PRESERVE QUESTION CORRECTNESS EXACTLY:
   - "NOT", "EXCEPT", "INCORRECT", "FALSE", "LEAST", "MOST", "NEVER", "ALWAYS" must be translated AND visually emphasised using Tamil negation markers like "இல்லை", "அல்ல", "தவிர", "கூடாது".
   - Option order stays identical (A=A, B=B, C=C, D=D).
   - Numbers, units (m/s², kg, pH), chemical formulas (H₂O, ATP), and math notation stay as-is.

5. Write naturally — a Tamil-medium NEET student should feel it was written in Tamil originally.

6. Do NOT transliterate English into Tamil script unless students commonly use the English term (DNA, RNA, pH stay in English).

Call submit_translation with your translation.`;

  const response = await ant.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    tools: [{
      name: "submit_translation",
      description: "Submit the Tamil translation with metadata.",
      input_schema: {
        type: "object" as const,
        properties: {
          tamil_question_text: { type: "string" },
          tamil_options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          tamil_explanation: { type: "string" },
          model_observations: {
            type: "object",
            properties: {
              glossary_match_rate:  { type: "number"  },
              retrieval_matches:    { type: "integer" },
              contains_negation:    { type: "boolean" },
              option_count_match:   { type: "boolean" },
              context_relevance:    { type: "string", enum: ["high", "medium", "low"] },
              glossary_coverage:    { type: "string" },
            },
            required: ["glossary_match_rate","retrieval_matches","contains_negation","option_count_match","context_relevance","glossary_coverage"],
          },
          used_glossary_terms: { type: "array", items: { type: "object", properties: { english: { type: "string" }, tamil: { type: "string" } } } },
          missing_expected_terms: { type: "array", items: { type: "string" } },
        },
        required: ["tamil_question_text","tamil_options","tamil_explanation","model_observations","used_glossary_terms","missing_expected_terms"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_translation" },
    messages: [{ role: "user", content: `Translate this ${q.subject} question (${q.difficulty}, chapter: ${q.chapter}).\n\nQuestion:\n${q.text}\n\nOptions:\n${options}` }],
  });

  const tool = response.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") throw new Error("No tool_use in response");
  return tool.input as {
    tamil_question_text: string;
    tamil_options: string[];
    tamil_explanation: string;
    model_observations: Record<string, unknown>;
    used_glossary_terms: { english: string; tamil: string }[];
    missing_expected_terms: string[];
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  console.log("\n🔍  Tamil Pipeline Verification\n");

  // ── 1. Load question
  hr("STEP 1 — English Question");
  const q = await loadQuestion(args);
  console.log(`  ID:         ${q.id}`);
  console.log(`  Subject:    ${q.subject} | Chapter: ${q.chapter}`);
  console.log(`  Difficulty: ${q.difficulty} | Concept: ${q.concept}`);
  console.log(`\n  Question:\n  ${q.text}`);
  console.log(`\n  Options:`);
  (q.options as string[]).forEach((o, i) => console.log(`    ${String.fromCharCode(65+i)}. ${o}`));

  // ── 2. Embed
  hr("STEP 2 — Embedding (OpenAI text-embedding-3-small)");
  let embedding: number[] | null = null;
  try {
    embedding = await embed(q.text);
    console.log(`  ✅ Vector generated — ${embedding.length} dims`);
    console.log(`  First 5 values: [${embedding.slice(0,5).map(v=>v.toFixed(4)).join(", ")}...]`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ⚠️  Skipped — ${msg.slice(0, 100)}`);
    console.log(`  → Continuing without embedding (context_relevance will be 'low')`);
  }

  // ── 3. Retrieve context
  hr("STEP 3 — RAG Retrieval (tamil_knowledge_chunks)");
  let chunks: Awaited<ReturnType<typeof retrieveContext>> = [];
  if (embedding) {
    chunks = await retrieveContext(embedding, q.subject, q.chapter);
    if (chunks.length === 0) {
      console.log("  ⚠️  No chunks found — proceeding without context");
    } else {
      console.log(`  ✅ ${chunks.length} chunks retrieved:`);
      chunks.forEach((c, i) => console.log(`  [${i+1}] (${c.source_type}) ${c.chapter ?? "—"}\n      ${c.tamil_text.slice(0, 100)}...`));
    }
  } else {
    console.log("  ⊘  Skipped — no embedding available (RAG requires OpenAI)");
  }

  // ── 4. Glossary
  hr("STEP 4 — Glossary Lookup");
  const glossary = await lookupGlossary(q.text, q.subject);
  if (glossary.length === 0) {
    console.log("  (no glossary matches for this question)");
  } else {
    console.log(`  ✅ ${glossary.length} matches:`);
    glossary.forEach((m) => console.log(`    ${m.english_term.padEnd(25)} → ${m.tamil_term}`));
  }

  // ── 5. Translate
  hr("STEP 5 — Claude Sonnet 4.6 Translation");
  console.log("  Calling API...");
  const draft = await translate(q, glossary, chunks);
  console.log("  ✅ Translation received\n");

  console.log("  TAMIL QUESTION:");
  console.log(`  ${draft.tamil_question_text}\n`);
  console.log("  TAMIL OPTIONS:");
  draft.tamil_options.forEach((o, i) => console.log(`    ${String.fromCharCode(65+i)}. ${o}`));
  if (draft.tamil_explanation) {
    console.log(`\n  TAMIL EXPLANATION:`);
    console.log(`  ${draft.tamil_explanation}`);
  }

  // ── 6. Validate
  hr("STEP 6 — Objective Validation");
  const validation = validateTranslation(
    { question_text: q.text, options: q.options as string[] },
    draft,
    glossary.map((m) => ({ id: m.id, english_term: m.english_term, tamil_term: m.tamil_term, subject: m.subject })),
    chunks.map((c) => ({ id: c.id, source_type: c.source_type, subject: q.subject.toLowerCase(),
      chapter: c.chapter ?? null, tamil_text: c.tamil_text, english_reference: c.english_reference ?? null, similarity: 0 })),
  );

  const scoreBar = "█".repeat(Math.floor(validation.score / 5)) + "░".repeat(20 - Math.floor(validation.score / 5));
  console.log(`\n  Score:  ${validation.score}/100  [${scoreBar}]`);
  console.log(`  Status: ${validation.auto_review_required ? "⚠️  review_required" : "✅ ai_drafted"}`);

  console.log("\n  Checks:");
  const checks = validation.checks;
  const fmt = (v: boolean | number | string) =>
    v === true ? "✅" : v === false ? "❌" : typeof v === "number" ? `${v}%` : v;

  console.log(`    risk_words_preserved        ${fmt(checks.risk_words_preserved)}  (30%)`);
  console.log(`    glossary_match_rate         ${fmt(checks.glossary_match_rate)}  (25%)`);
  console.log(`    option_count_match          ${fmt(checks.option_count_match)}  (20%)`);
  console.log(`    number_count_match          ${fmt(checks.number_count_match)}  (10%)`);
  console.log(`    unit_preserved              ${fmt(checks.unit_preserved)}  (10%)`);
  console.log(`    chemical_formula_preserved  ${fmt(checks.chemical_formula_preserved)}  ( 5%)`);
  console.log(`    math_notation_preserved     ${fmt(checks.math_notation_preserved)}  ( 5%)`);
  console.log(`    context_relevance           ${checks.context_relevance}  (info)`);
  console.log(`    retrieval_matches           ${checks.retrieval_matches}       (info)`);

  if (validation.failed_checks.length > 0) {
    console.log(`\n  ❌ Failed: ${validation.failed_checks.join(", ")}`);
  }

  // ── 7. Model's own observations
  hr("STEP 7 — Model Self-Report (model_observations)");
  console.log(`  glossary_match_rate:  ${draft.model_observations.glossary_match_rate}%`);
  console.log(`  retrieval_matches:    ${draft.model_observations.retrieval_matches}`);
  console.log(`  contains_negation:    ${draft.model_observations.contains_negation}`);
  console.log(`  context_relevance:    ${draft.model_observations.context_relevance}`);
  console.log(`  glossary_coverage:    ${draft.model_observations.glossary_coverage}`);
  if (draft.used_glossary_terms.length > 0) {
    console.log(`\n  Used glossary terms:`);
    draft.used_glossary_terms.forEach((t) => console.log(`    ${t.english} → ${t.tamil}`));
  }
  if (draft.missing_expected_terms.length > 0) {
    console.log(`\n  ⚠️  Missing expected terms: ${draft.missing_expected_terms.join(", ")}`);
  }

  // ── 8. Store
  hr("STEP 8 — Storing to DB");
  const status = validation.auto_review_required ? "review_required" : "ai_drafted";
  const { error: storeErr } = await sb.from("questions").update({
    tamil_question_text:     draft.tamil_question_text,
    tamil_options:           draft.tamil_options,
    tamil_explanation:       draft.tamil_explanation ?? null,
    tamil_status:            status,
    tamil_confidence_notes:  draft.model_observations,
    tamil_validation_result: {
      score:                validation.score,
      auto_review_required: validation.auto_review_required,
      failed_checks:        validation.failed_checks,
      checks:               validation.checks,
    },
    tamil_drafted_at: new Date().toISOString(),
  }).eq("id", q.id);

  if (storeErr) {
    console.log(`  ❌ Store failed: ${storeErr.message}`);
  } else {
    console.log(`  ✅ Stored — tamil_status = '${status}'`);
    console.log(`\n  Verify in Supabase:`);
    console.log(`  SELECT tamil_question_text, tamil_status FROM questions WHERE id = '${q.id}';`);
  }

  // ── Final summary
  hr("RESULT SUMMARY");
  console.log(`  Question ID:  ${q.id}`);
  console.log(`  Subject:      ${q.subject} / ${q.chapter}`);
  console.log(`  Score:        ${validation.score}/100`);
  console.log(`  Status:       ${status}`);
  console.log(`  Failed:       ${validation.failed_checks.length === 0 ? "none" : validation.failed_checks.join(", ")}`);
  console.log(`  Glossary:     ${glossary.length} terms matched`);
  console.log(`  Context:      ${chunks.length} chunks retrieved\n`);
}

main().catch((e) => {
  console.error("\n❌ Pipeline error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
