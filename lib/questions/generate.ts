/**
 * Shared question-generation skeleton — English and Tamil.
 *
 * Uses its own Supabase client (no @/lib/db/client import) so this module
 * is safe to run from CLI scripts as well as Next.js server actions.
 * The server-only guard lives in lib/db/client.ts which is only for Next.js;
 * this module is deliberately outside that chain.
 *
 * Pipeline per call:
 *   1. ANCHORS    — up to 4 human-verified PYQ rows (same language + chapter).
 *   2. GROUNDING  — Tamil only: Samacheer knowledge chunks + glossary terms.
 *   3. GENERATE   — one Claude call, language-native system prompt, JSON array.
 *   4. STRUCTURAL — 4 non-empty options, no duplicates, no "all of the above".
 *   5. DEDUP      — text-normalised against existing rows of the SAME language.
 *                   English and Tamil dedup pools are fully separate.
 *   6. VERIFY     — verifyQuestion() from ./verify; gateStatus → publishStatus.
 *   7. RETURN     — caller decides: INSERT (real run) or print only (dry-run).
 *
 * No diagnosis category is assigned here — that is computed per-attempt by
 * diagnoseDetailed() at report time and must stay there.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NCERT_CHAPTERS } from "@/lib/questions/chapters";
import {
  verifyQuestion,
  gateStatus,
  publishStatus,
  type Language,
} from "@/lib/questions/verify";
import { generateEmbedding } from "@/lib/tamil/embed";

// ── Re-export types the CLI needs ──────────────────────────────────────────────

export type { Language };
export type Subject    = "Physics" | "Chemistry" | "Biology";
export type Difficulty = "Easy" | "Medium" | "Hard";

// ── Parameter / result types ───────────────────────────────────────────────────

export type GenerateParams = {
  language:   Language;
  subject:    Subject;
  chapter:    string;
  difficulty: Difficulty;
  count:      number;
  /** null = global bank (default).  Pass a UUID for centre-scoped inserts. */
  centreId?:  string | null;
};

export type GeneratedRow = {
  body:          string;
  options:       string[];   // 4 strings
  answerIndex:   number;     // 0–3
  concept:       string;
  explanation:   string;
  status:        "draft" | "verified" | "live";
  verifierRaw:   { answer: string; confident: boolean };
  verifierIndex: number;     // 0–3, or −1 if unparseable
};

export type GenerateResult = {
  anchorsUsed: number;
  generated:   number;
  /** All rows that passed structural + dedup checks, with computed status. */
  published:   GeneratedRow[];
  /** Rows dropped before reaching the verifier. */
  discarded:   { body: string; reason: string }[];
};

// ── Constants ──────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-6";

const LETTER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
const PAR: Record<Difficulty, number> = { Easy: 45, Medium: 60, Hard: 90 };

const SUBJECTS: Subject[]        = ["Physics", "Chemistry", "Biology"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

// ── Lazy singletons ────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set.");
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

let _db: SupabaseClient | null = null;
function getDb(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _db;
}

// ── Validators (exported for the CLI) ─────────────────────────────────────────

export function validateSubject(s: string): s is Subject {
  return (SUBJECTS as string[]).includes(s);
}

export function validateDifficulty(d: string): d is Difficulty {
  return (DIFFICULTIES as string[]).includes(d);
}

export function validateChapter(subject: Subject, chapter: string): boolean {
  return (NCERT_CHAPTERS[subject] ?? []).includes(chapter);
}

// ── Text normaliser for dedup ──────────────────────────────────────────────────

const norm = (s: string) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);

// ── JSON parser that handles code-fenced model output ─────────────────────────

function parseJsonArray(text: string): unknown[] {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text;
  const start = raw.search(/\[/);
  const parsed = JSON.parse(start >= 0 ? raw.slice(start) : raw);
  if (!Array.isArray(parsed)) throw new Error("Model did not return a JSON array.");
  return parsed;
}

// ── 1. Anchor fetch ────────────────────────────────────────────────────────────

type AnchorRow = { body: string; options: string[]; answerIndex: number };

async function fetchAnchors(
  language: Language,
  subject: Subject,
  chapter: string,
): Promise<AnchorRow[]> {
  try {
    const { data, error } = await getDb()
      .from("questions")
      .select("body, options, answer_index")
      .eq("language", language)
      .eq("subject", subject)
      .eq("chapter", chapter)
      .eq("source", "pyq")
      .eq("status", "live")
      .is("centre_id", null)
      .limit(4);

    if (error) {
      console.warn(`[generate] ⚠ Anchor fetch failed: ${error.message}`);
      return [];
    }

    return (data ?? [])
      .map((r) => {
        const body = r.body as string | null;
        const options = r.options as string[] | null;
        if (!body || !options) return null;
        return { body, options, answerIndex: r.answer_index as number };
      })
      .filter((r): r is AnchorRow => r !== null);
  } catch (e) {
    console.warn(`[generate] ⚠ Anchor fetch threw: ${(e as Error).message}`);
    return [];
  }
}

// ── Dedup pool ────────────────────────────────────────────────────────────────

async function buildDedupeSet(
  language: Language,
  subject: Subject,
  chapter: string,
): Promise<Set<string>> {
  const seen = new Set<string>();
  try {
    const { data } = await getDb()
      .from("questions")
      .select("body")
      .eq("language", language)
      .eq("subject", subject)
      .eq("chapter", chapter)
      .is("centre_id", null);

    for (const r of data ?? []) {
      const txt = r.body as string | null;
      if (txt) seen.add(norm(txt));
    }
  } catch {
    // Non-fatal — dedup is best-effort.
  }
  return seen;
}

// ── 2. Tamil grounding ────────────────────────────────────────────────────────
// normalise → match glossary terms → look up knowledge chunks (chapter first,
// subject fallback). Embedding-based retrieval is tried first if OPENAI_API_KEY
// is present; falls back to direct chapter filter if the key is absent.

type GlossaryRow = { english_term: string; tamil_term: string; subject: string | null };
type ChunkRow    = { tamil_text: string };

function normaliseTerm(text: string): string {
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

async function lookupGlossary(
  text: string,
  subject: string,
): Promise<GlossaryRow[]> {
  const { data, error } = await getDb()
    .from("tamil_glossary")
    .select("english_term, tamil_term, subject")
    .or(`subject.eq.${subject.toLowerCase()},subject.is.null`);
  if (error || !data) return [];

  const normInput = normaliseTerm(text);
  return (data as GlossaryRow[]).filter((row) => {
    const normTerm = normaliseTerm(row.english_term);
    const re = new RegExp(`(?<![a-z])${normTerm.replace(/\s+/g, "\\s+")}(?![a-z])`, "i");
    return re.test(normInput);
  });
}

async function lookupChunks(
  subject: string,
  chapter: string,
  embeddingStr?: string,
): Promise<ChunkRow[]> {
  const db = getDb();
  const subjectLower = subject.toLowerCase();

  // Embedding-based retrieval if we have an embedding string.
  if (embeddingStr) {
    const { data: emb } = await db
      .from("tamil_knowledge_chunks")
      .select("tamil_text")
      .eq("subject", subjectLower)
      .order(`embedding <=> '${embeddingStr}'`)
      .limit(5);
    if (emb && emb.length > 0) return emb as ChunkRow[];
  }

  // Chapter-specific filter (no embedding).
  const { data: cd } = await db
    .from("tamil_knowledge_chunks")
    .select("tamil_text")
    .eq("subject", subjectLower)
    .eq("chapter", chapter)
    .limit(5);
  if (cd && cd.length >= 2) return cd as ChunkRow[];

  // Subject-wide fallback.
  const { data: sd } = await db
    .from("tamil_knowledge_chunks")
    .select("tamil_text")
    .eq("subject", subjectLower)
    .limit(5);
  return (sd ?? []) as ChunkRow[];
}

async function groundTamil(
  subject: Subject,
  chapter: string,
): Promise<{ glossaryBlock: string; contextBlock: string }> {
  const glossaryMatches = await lookupGlossary(chapter, subject);
  const glossaryBlock =
    glossaryMatches.length > 0
      ? glossaryMatches.map((m) => `  ${m.english_term} → ${m.tamil_term}`).join("\n")
      : "  (no glossary matches for this chapter)";

  // Try embedding, fall back gracefully.
  let embeddingStr: string | undefined;
  try {
    const vec = await generateEmbedding(chapter);
    embeddingStr = `[${vec.join(",")}]`;
  } catch {
    console.warn("[generate] OPENAI_API_KEY absent; using chapter filter for Tamil context.");
  }

  const chunks = await lookupChunks(subject, chapter, embeddingStr);
  const contextBlock =
    chunks.length > 0
      ? chunks.map((c, i) => `[${i + 1}] ${c.tamil_text}`).join("\n\n")
      : "  (no reference material — generate from first principles)";

  return { glossaryBlock, contextBlock };
}

// ── 3. Prompt builders ────────────────────────────────────────────────────────

function buildEnglishPrompt(p: {
  subject: Subject;
  chapter: string;
  difficulty: Difficulty;
  count: number;
  anchors: AnchorRow[];
}): { system: string; user: string } {
  const examplesBlock =
    p.anchors.length > 0
      ? `\nBase your style and difficulty on these real past-paper questions:\n${JSON.stringify(
          p.anchors.map((a) => ({
            body: a.body,
            options: a.options,
            answer: "ABCD"[a.answerIndex] ?? "A",
          })),
          null,
          2,
        )}\n`
      : "";

  const system = `You are an expert NEET (India) question setter writing original MCQs \
for the NCERT ${p.subject} chapter "${p.chapter}".

RULES:
1. Every WRONG option must encode a specific, common student misconception — \
never a random or absurd distractor. State what the student is confusing.
2. The explanation must cite the exact NCERT section it rests on \
(e.g. "NCERT Class 12 Physics §3.4 — Drift velocity").
3. Stay strictly within chapter "${p.chapter}". No cross-chapter concepts.
4. Questions must be self-contained in plain text — no figures, no "see diagram".
5. No "All of the above" or "None of the above" options.
6. Exactly one unambiguously correct answer.
Return ONLY a JSON array — no prose, no markdown outside the array.`;

  const user = `Generate ${p.count} ${p.difficulty}-difficulty NEET MCQs for \
NCERT ${p.subject} chapter "${p.chapter}".${examplesBlock}
Return a JSON array.  Each element:
{"body": str, "options": [4 strings], "answer": "A"|"B"|"C"|"D", "concept": str, "explanation": str}`;

  return { system, user };
}

function buildTamilPrompt(p: {
  subject: Subject;
  chapter: string;
  difficulty: Difficulty;
  count: number;
  anchors: AnchorRow[];
  glossaryBlock: string;
  contextBlock: string;
}): { system: string; user: string } {
  const subjectTa: Record<Subject, string> = {
    Physics:   "இயற்பியல்",
    Chemistry: "வேதியியல்",
    Biology:   "உயிரியல்",
  };
  const diffTa: Record<Difficulty, string> = {
    Easy: "எளிமையான", Medium: "நடுத்தர", Hard: "கடினமான",
  };

  const examplesBlock =
    p.anchors.length > 0
      ? `\nகடந்த கால NEET வினாக்கள் (இந்த நடை மற்றும் நிலையை பின்பற்றவும்):\n${JSON.stringify(
          p.anchors.map((a) => ({
            body: a.body,
            options: a.options,
            answer: "ABCD"[a.answerIndex] ?? "A",
          })),
          null,
          2,
        )}\n`
      : "";

  const system = `நீங்கள் NEET (India) தேர்வுக்கான ${subjectTa[p.subject]} வினா உருவாக்குநர். \
"${p.chapter}" அதிகாரத்திற்கு மட்டும் வினாக்கள் உருவாக்குங்கள்.

கட்டாய விதிகள்:
1. தவறான ஒவ்வொரு விருப்பமும் ஒரு குறிப்பிட்ட மாணவர் தவறான கருத்தை பிரதிபலிக்க வேண்டும்.
2. விளக்கம் NCERT/சமச்சீர் பாடத்திட்டத்தில் உள்ள குறிப்பிட்ட பகுதியை மேற்கோள் காட்ட வேண்டும்.
3. "${p.chapter}" அதிகாரத்திற்கு மட்டும் — வேறு அதிகாரங்கள் இல்லை.
4. வினா எளிய உரையில் இருக்க வேண்டும் — படங்கள் அல்லது அட்டவணைகள் இல்லை.
5. "மேலே அனைத்தும்" அல்லது "மேலே எதுவும் இல்லை" விருப்பங்கள் கூடாது.
6. சரியான விடை ஒன்று மட்டுமே இருக்க வேண்டும்.

கட்டாய சொல்லகராதி (இந்த தமிழ் சொற்களை மட்டுமே பயன்படுத்தவும்):
${p.glossaryBlock}

குறிப்பு மூலங்கள் (இந்த பாணி மற்றும் சொல்வழக்கை பின்பற்றவும்):
${p.contextBlock}
${examplesBlock}
JSON மட்டும் திரும்பவும் — உரை வேண்டாம்.`;

  const user = `NCERT ${subjectTa[p.subject]} "${p.chapter}" அதிகாரத்தில் \
${p.count} ${diffTa[p.difficulty]} NEET MCQ உருவாக்குங்கள்.

ஒவ்வொரு உருப்படியும்:
{"body": str, "options": [4 strings], "answer": "A"|"B"|"C"|"D", "concept": str, "explanation": str}
JSON array மட்டும்.`;

  return { system, user };
}

// ── Main generator ─────────────────────────────────────────────────────────────

export async function generateQuestions(
  params: GenerateParams,
): Promise<GenerateResult> {
  const { language, subject, chapter, difficulty, count } = params;

  // Step 1: Anchors
  const anchors = await fetchAnchors(language, subject, chapter);
  if (anchors.length < 2) {
    console.warn(
      `[generate] ⚠ Only ${anchors.length} ${language.toUpperCase()} anchor(s) for ` +
        `${subject}/${chapter}. Generating without full few-shot; accuracy may be lower.`,
    );
  }

  // Step 2: Tamil grounding (English skips)
  let glossaryBlock = "";
  let contextBlock  = "";
  if (language === "ta") {
    ({ glossaryBlock, contextBlock } = await groundTamil(subject, chapter));
  }

  // Step 3: Build prompt + call Claude
  const prompt =
    language === "en"
      ? buildEnglishPrompt({ subject, chapter, difficulty, count, anchors })
      : buildTamilPrompt({ subject, chapter, difficulty, count, anchors, glossaryBlock, contextBlock });

  console.log(
    `[generate] Calling ${MODEL} (${language}) — ${count}×${difficulty} ${subject}/${chapter}…`,
  );

  let generated: unknown[];
  try {
    const response = await getAnthropic().messages.create({
      model:      MODEL,
      max_tokens: 8192,
      system:     prompt.system,
      messages:   [{ role: "user", content: prompt.user }],
    });
    const text = (response.content ?? [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    generated = parseJsonArray(text);
  } catch (e) {
    throw new Error(`Generation failed: ${(e as Error).message}`);
  }

  // Step 5: Dedup set (same language only)
  const seen = await buildDedupeSet(language, subject, chapter);

  // Steps 4 + 5 + 6: Structural → dedup → verify
  const published: GeneratedRow[] = [];
  const discarded: { body: string; reason: string }[] = [];

  for (const g of generated) {
    const item        = g as Record<string, unknown>;
    const body        = String(item.body    ?? "").trim();
    const options     = (Array.isArray(item.options) ? item.options : []).map((o) => String(o).trim());
    const answerLetter = String(item.answer ?? "").toUpperCase();
    const answerIndex  = LETTER[answerLetter];
    const concept      = String(item.concept     ?? chapter).slice(0, 120);
    const explanation  = String(item.explanation ?? "").trim();

    const drop = (reason: string) =>
      discarded.push({ body: body.slice(0, 70) || "(empty)", reason });

    // Structural checks
    if (!body)                                                    { drop("empty body");                            continue; }
    if (options.length !== 4 || options.some((o) => !o))         { drop("must have exactly 4 non-empty options"); continue; }
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) { drop("duplicate options");                     continue; }
    if (options.some((o) => /all of the above|none of the above/i.test(o))) {
      drop("ambiguous catch-all option"); continue;
    }
    if (answerIndex === undefined) { drop(`invalid answer letter "${answerLetter}"`); continue; }

    // Dedup (this language only)
    const key = norm(body);
    if (seen.has(key)) { drop("duplicate of existing row in this language"); continue; }
    seen.add(key);

    // Step 6: Verify
    let vResult;
    try {
      vResult = await verifyQuestion({ body, options, answerIndex, language });
    } catch (e) {
      drop(`verifier call failed: ${(e as Error).message}`);
      continue;
    }

    const gate   = gateStatus(vResult);
    const status = publishStatus(gate, language);

    published.push({
      body,
      options,
      answerIndex,
      concept,
      explanation,
      status,
      verifierRaw:   vResult.raw,
      verifierIndex: vResult.verifierIndex,
    });
  }

  return {
    anchorsUsed: anchors.length,
    generated:   generated.length,
    published,
    discarded,
  };
}

// ── Step 7: Insert (caller calls this AFTER reviewing dry-run output) ──────────

/**
 * Write the published rows to the questions table.
 * Called only after --dry-run has been reviewed and approved.
 */
export async function insertGenerated(
  rows: GeneratedRow[],
  params: Pick<GenerateParams, "language" | "subject" | "chapter" | "difficulty" | "centreId">,
): Promise<number> {
  if (rows.length === 0) return 0;

  const { language, subject, chapter, difficulty, centreId = null } = params;
  const { data, error } = await getDb()
    .from("questions")
    .insert(
      rows.map((r) => ({
        centre_id:      centreId,
        source:         "ai",
        language,
        status:         r.status,
        subject,
        chapter,
        concept:        r.concept,
        difficulty,
        par_time_sec:   PAR[difficulty],
        body:           r.body,
        options:        r.options,
        explanation:    r.explanation,
        answer_index:   r.answerIndex,
        verifier_raw:   r.verifierRaw,
        verifier_index: r.verifierIndex,
      })),
    )
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
