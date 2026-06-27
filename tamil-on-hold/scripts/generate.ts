/**
 * AI question generator — English and Tamil.
 *
 * Usage:
 *   npx tsx scripts/generate.ts --language en --subject Physics --chapter "Laws of Motion" --difficulty Medium --count 5
 *   npx tsx scripts/generate.ts --language ta --subject Physics --chapter "Laws of Motion" --difficulty Medium --count 5 --dry-run
 *
 *   npm run generate:questions -- --language en --subject Physics --chapter "Laws of Motion" --difficulty Medium --count 5 --dry-run
 *
 * Flags:
 *   --language    en | ta                          (required)
 *   --subject     Physics | Chemistry | Biology    (required)
 *   --chapter     "<NCERT chapter name>"           (required; validated against NCERT list)
 *   --difficulty  Easy | Medium | Hard             (default: Medium)
 *   --count       1–30                             (default: 5)
 *   --dry-run     Print everything; do NOT write to the database.
 *
 * Requires .env.local:
 *   ANTHROPIC_API_KEY          — generation + verification calls
 *   NEXT_PUBLIC_SUPABASE_URL   — anchor + dedup queries
 *   SUPABASE_SERVICE_ROLE_KEY  — anchor + dedup queries
 *   OPENAI_API_KEY             — Tamil pgvector retrieval only (optional; falls back to chapter filter)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  generateQuestions,
  insertGenerated,
  validateChapter,
  validateSubject,
  validateDifficulty,
  type Language,
  type Subject,
  type Difficulty,
  type GeneratedRow,
} from "@/lib/questions/generate";

// ── Arg helpers ───────────────────────────────────────────────────────────────

function flag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? null) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

// ── Parse & validate ──────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error(`\n✗ ${msg}`);
  console.error(
    "\nUsage: npx tsx scripts/generate.ts" +
      " --language en|ta" +
      " --subject Physics|Chemistry|Biology" +
      ' --chapter "<NCERT chapter name>"' +
      " [--difficulty Easy|Medium|Hard]" +
      " [--count N]" +
      " [--dry-run]\n",
  );
  process.exit(1);
}

const languageRaw  = flag("language");
const subjectRaw   = flag("subject");
const chapterRaw   = flag("chapter");
const diffRaw      = flag("difficulty") ?? "Medium";
const countRaw     = flag("count")      ?? "5";
const dryRun       = hasFlag("dry-run");

if (!languageRaw || (languageRaw !== "en" && languageRaw !== "ta")) {
  die("--language must be 'en' or 'ta'");
}
if (!subjectRaw || !validateSubject(subjectRaw)) {
  die("--subject must be Physics, Chemistry, or Biology");
}
if (!chapterRaw) {
  die("--chapter is required");
}
if (!validateDifficulty(diffRaw)) {
  die("--difficulty must be Easy, Medium, or Hard");
}
if (!validateChapter(subjectRaw as Subject, chapterRaw)) {
  die(`"${chapterRaw}" is not a valid NCERT ${subjectRaw} chapter. Check lib/questions/chapters.ts for the full list.`);
}

const language   = languageRaw  as Language;
const subject    = subjectRaw   as Subject;
const chapter    = chapterRaw;
const difficulty = diffRaw      as Difficulty;
const count      = Math.max(1, Math.min(30, Number(countRaw)));

// ── Printer ───────────────────────────────────────────────────────────────────

function printRow(i: number, q: GeneratedRow): void {
  const genLetter = "ABCD"[q.answerIndex] ?? "?";
  const verLetter = q.verifierIndex >= 0 ? "ABCD"[q.verifierIndex] ?? "?" : "?";
  const agreed    = q.verifierIndex === q.answerIndex;

  console.log(`\n  ── [${i + 1}] STATUS: ${q.status.toUpperCase()} ──────────────────────────────`);
  console.log(`  Body    : ${q.body}`);
  console.log(`  Options :`);
  q.options.forEach((o, j) =>
    console.log(`    ${String.fromCharCode(65 + j)}) ${o}${j === q.answerIndex ? "  ← correct" : ""}`),
  );
  console.log(`  Answer  : ${genLetter}`);
  console.log(
    `  Verifier: picked ${verLetter}  agreed=${agreed}  confident=${q.verifierRaw.confident}`,
  );
  console.log(`  Concept : ${q.concept}`);
  console.log(`  Explain : ${q.explanation}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${"═".repeat(62)}`);
  console.log(
    `  GENERATE ${language.toUpperCase()} QUESTIONS${dryRun ? "  [DRY RUN — no DB write]" : ""}`,
  );
  console.log(`  ${subject} / ${chapter}`);
  console.log(`  Difficulty: ${difficulty}   Count: ${count}`);
  console.log(`${"═".repeat(62)}\n`);

  const result = await generateQuestions({
    language, subject, chapter, difficulty, count, centreId: null,
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n── Summary ──────────────────────────────────────────────────────`);
  console.log(`  Anchors used : ${result.anchorsUsed}`);
  console.log(`  Generated    : ${result.generated}`);
  console.log(`  Published    : ${result.published.length}  (will be inserted if not --dry-run)`);
  console.log(`  Discarded    : ${result.discarded.length}`);

  if (result.discarded.length > 0) {
    console.log(`\n── Discarded ────────────────────────────────────────────────────`);
    for (const d of result.discarded) {
      console.log(`  ✗ "${d.body}"  —  ${d.reason}`);
    }
  }

  const byStatus = result.published.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});
  if (Object.keys(byStatus).length > 0) {
    console.log(`\n  By status: ${Object.entries(byStatus).map(([k, v]) => `${v}×${k}`).join(", ")}`);
  }

  // ── Per-question detail ────────────────────────────────────────────────────
  if (result.published.length > 0) {
    console.log(`\n── Published questions ──────────────────────────────────────────`);
    result.published.forEach((q, i) => printRow(i, q));
  }

  // ── Dry-run gate ──────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(62)}`);
  if (dryRun) {
    console.log(`  DRY RUN complete — nothing written to the database.`);
    console.log(`  Re-run without --dry-run to insert ${result.published.length} row(s).`);
    console.log(`${"═".repeat(62)}\n`);
    return;
  }

  if (result.published.length === 0) {
    console.log(`  No rows to insert.\n`);
    return;
  }

  // ── Real insert ───────────────────────────────────────────────────────────
  console.log(`  Inserting ${result.published.length} row(s)…`);
  const inserted = await insertGenerated(result.published, {
    language, subject, chapter, difficulty, centreId: null,
  });
  console.log(`  ✓ Inserted ${inserted} question(s).\n`);
  console.log(`${"═".repeat(62)}\n`);
}

main().catch((e) => {
  console.error("\n✗ Fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
