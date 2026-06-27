/**
 * Ingests a Samacheer Kalvi Tamil textbook PDF into tamil_knowledge_chunks.
 * No OpenAI. No embeddings. Retrieval uses chapter-name filter only.
 *
 * Usage:
 *   npm run ingest:pdf
 *   npm run ingest:pdf -- --file "path/to/book.pdf" --subject physics --class 11
 *   npm run ingest:pdf -- --dry-run          (print passages, don't insert)
 *   npm run ingest:pdf -- --clear            (delete existing samacheer chunks first)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";

// ─── CLI args ─────────────────────────────────────────────────────────────────
function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? (process.argv[i + 1] ?? null) : null;
}
const hasFlag = (f: string) => process.argv.includes(f);

const PDF_PATH =
  getArg("--file") ??
  "11th_tamil_medium_book/Class_11_Physics_Tamil_Volume_1_2024_Edition-www.tntextbooks.in.pdf";

const SUBJECT_RAW = (getArg("--subject") ?? "physics").toLowerCase();
if (!["physics", "chemistry", "biology"].includes(SUBJECT_RAW)) {
  console.error(`✗ --subject must be physics, chemistry, or biology (got "${SUBJECT_RAW}")`);
  process.exit(1);
}
const SUBJECT = SUBJECT_RAW as "physics" | "chemistry" | "biology";

const CLASS_RAW = getArg("--class") ?? "11";
if (CLASS_RAW !== "11" && CLASS_RAW !== "12") {
  console.error(`✗ --class must be 11 or 12 (got "${CLASS_RAW}")`);
  process.exit(1);
}
const CLASS_LEVEL = CLASS_RAW as "11" | "12";

const DRY_RUN       = hasFlag("--dry-run");
const CLEAR_FIRST   = hasFlag("--clear");
const MAX_CHUNK_LEN = 800;   // chars — target passage length

// ─── Chapter maps: subject → class → Samacheer chapter number → DB chapter names ─
// Keyed by subject + class level so Physics ch.1 and Chemistry ch.1 never collide.
// The DB uses NCERT-style English names. Add new subject/class branches only when
// you have the actual PDF — do NOT fill in chapter names you have not verified.
type ChapterEntry = { tamil_name: string; db_chapters: string[] };
type SubjectMap   = Partial<Record<"11" | "12", Record<number, ChapterEntry>>>;

const CHAPTER_MAPS: Partial<Record<"physics" | "chemistry" | "biology", SubjectMap>> = {
  physics: {
    "11": {
      1: {
        tamil_name: "இயல் உலகத்தின் தன்மையும் அளவீட்டியலும்",
        db_chapters: ["Units and Measurements", "Nature of Physical World and Measurement"],
      },
      2: {
        tamil_name: "இயக்கவியல்",
        db_chapters: ["Kinematics", "Motion in a Straight Line", "Motion in a Plane"],
      },
      3: {
        tamil_name: "இயக்க விதிகள்",
        db_chapters: ["Laws of Motion"],
      },
      4: {
        tamil_name: "வேலை, ஆற்றல் மற்றும் திறன்",
        db_chapters: ["Work, Energy and Power"],
      },
      5: {
        tamil_name: "துகள்களாலான அமைப்பு மற்றும் திணிப்பொருட்களின் இயக்கம்",
        db_chapters: ["System of Particles and Rotational Motion", "Rotational Motion"],
      },
      // Add chapters 6–11 when Volume 2 PDF is available
    },
    // Add "12": { ... } when Physics 12th book is available
  },
  chemistry: {},
  biology:   {},
};

// Derive the active map for this run — exit loudly if subject+class not yet mapped
const activeMap: Record<number, ChapterEntry> = CHAPTER_MAPS[SUBJECT]?.[CLASS_LEVEL] ?? {};
if (Object.keys(activeMap).length === 0) {
  console.error(
    `✗ No chapter map found for ${SUBJECT} class ${CLASS_LEVEL}. ` +
    `Add entries to CHAPTER_MAPS in this script before ingesting this textbook.`,
  );
  process.exit(1);
}

// ─── Text cleaning ────────────────────────────────────────────────────────────
function cleanText(raw: string): string {
  return raw
    // Remove PDF file metadata lines (e.g. "PHYSICS_01_Tamil.indd 5  02-01-2023 14:08:42")
    .replace(/PHYSICS_\w+\.indd\s+\S+\s+\S+\s+\S+/g, "")
    // Remove date-time stamps
    .replace(/\d{2}[/-]\d{2}[/-]\d{4}\s+\d{2}:\d{2}:\d{2}/g, "")
    // Remove URLs
    .replace(/www\.\S+/g, "")
    // Remove standalone Roman numeral page markers (I, II, III, IV, V…)
    .replace(/^\s*[IVXivx]+\s*$/gm, "")
    // Remove lines that are ONLY a page number (1-350)
    .replace(/^\s*\d{1,3}\s*$/gm, "")
    // Remove the running header pattern: "{digits} அலகு {digit} {title}"
    .replace(/^\s*\d+\s+அலகு\s+\d+[^\n]*/gm, "")
    // Collapse excessive whitespace/blank lines
    .replace(/\t+/g, " ")
    .replace(/[ ]{3,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Chapter detection ────────────────────────────────────────────────────────
// Looks for "அலகு N" in the first 400 chars of a page (running header area).
function detectChapter(pageText: string): number | null {
  const header = pageText.slice(0, 400);
  const m = header.match(/அலகு\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Passage splitting ────────────────────────────────────────────────────────
// Splits accumulated chapter text into ~MAX_CHUNK_LEN char passages,
// breaking at paragraph boundaries. Filters out very short noise passages.
function splitIntoPassages(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 60);   // skip tiny fragments

  const passages: string[] = [];
  let buf = "";

  for (const para of paragraphs) {
    const candidate = buf ? buf + "\n\n" + para : para;
    if (candidate.length > MAX_CHUNK_LEN && buf.length > 0) {
      passages.push(buf);
      buf = para;
    } else {
      buf = candidate;
    }
  }
  if (buf.trim().length > 60) passages.push(buf);

  return passages;
}

// ─── End-of-run summary ───────────────────────────────────────────────────────
function printSummary(
  totalPages: number,
  chapterTexts: Record<number, string>,
  skippedUnmapped: number,
  frontMatter: number,
  tooShort: number,
  unmappedChapters: Set<number>,
): void {
  const ingestedChapters = Object.keys(chapterTexts).length;
  const ingestedPassages = Object.values(chapterTexts).reduce(
    (s, t) => s + splitIntoPassages(t).length,
    0,
  );

  console.log("\n── Ingest summary ─────────────────────────────────────");
  console.log(`  Subject                 : ${SUBJECT}  class ${CLASS_LEVEL}`);
  console.log(`  Total pages in PDF      : ${totalPages}`);
  console.log(`  Chapters ingested       : ${ingestedChapters}  (${ingestedPassages} passages)`);
  console.log(`  Pages skipped`);
  console.log(
    `    unmapped chapter      : ${skippedUnmapped}` +
    (unmappedChapters.size > 0 ? `  (chapters: ${[...unmappedChapters].sort((a, b) => a - b).join(", ")})` : ""),
  );
  console.log(`    front matter          : ${frontMatter}`);
  console.log(`    too short (< 30 chars): ${tooShort}`);

  if (ingestedChapters === 0) {
    process.stderr.write(
      `\n✗ WARNING: Zero chapters were ingested. ` +
      `Check that --subject and --class match the PDF content ` +
      `and that CHAPTER_MAPS has entries for ${SUBJECT} class ${CLASS_LEVEL}.\n`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const supabase = createClient(url, key);

  console.log(`\nSubject : ${SUBJECT}  Class : ${CLASS_LEVEL}`);
  console.log(`PDF     : ${PDF_PATH}`);
  console.log(`Mapped chapters: ${Object.keys(activeMap).join(", ")}\n`);

  // ── Load PDF ────────────────────────────────────────────────────────────────
  console.log(`Loading PDF…`);
  const buf = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });

  console.log("Extracting text from all pages (this may take a minute)…");
  const textResult = await parser.getText({});
  const totalPages = textResult.total;
  console.log(`✓ Extracted ${totalPages} pages`);

  // ── Process page by page ────────────────────────────────────────────────────
  let currentChapter: number | null = null;
  const chapterTexts: Record<number, string> = {};

  const warnedUnmapped     = new Set<number>();
  let skippedUnmappedPages = 0;
  let frontMatterPages     = 0;
  let tooShortPages        = 0;

  for (const page of textResult.pages) {
    const raw = page.text ?? "";

    // Detect chapter from running header
    const detected = detectChapter(raw);
    if (detected !== null) {
      if (detected in activeMap) {
        // Mapped chapter — start accumulating under it
        currentChapter = detected;
      } else {
        // Detected chapter not in map for this subject+class — warn once per chapter number
        if (!warnedUnmapped.has(detected)) {
          warnedUnmapped.add(detected);
          process.stderr.write(
            `⚠ SKIPPED page — chapter ${detected} not in map for ${SUBJECT} class ${CLASS_LEVEL}\n`,
          );
        }
        // Update currentChapter so pages aren't misattributed to the previous mapped chapter
        currentChapter = detected;
      }
    }

    // Skip: no chapter detected yet (front matter, TOC, etc.)
    if (currentChapter === null) {
      frontMatterPages++;
      continue;
    }

    // Skip: we're inside a chapter not in the map
    if (!(currentChapter in activeMap)) {
      skippedUnmappedPages++;
      continue;
    }

    const cleaned = cleanText(raw);
    if (cleaned.length < 30) {
      tooShortPages++;
      continue;   // skip mostly-empty pages
    }

    chapterTexts[currentChapter] = (chapterTexts[currentChapter] ?? "") + "\n\n" + cleaned;
  }

  // ── Report what we found ────────────────────────────────────────────────────
  console.log("\n── Chapter text extracted ─────────────────────────────");
  for (const [num, text] of Object.entries(chapterTexts)) {
    const n   = parseInt(num);
    const map = activeMap[n];
    const passages = splitIntoPassages(text);
    console.log(`  Chapter ${n} (${map.tamil_name})`);
    console.log(`    DB chapters : ${map.db_chapters.join(", ")}`);
    console.log(`    Text length : ${text.length} chars → ${passages.length} passages`);
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] Sample passages from Chapter 3 (Laws of Motion):");
    const ch3 = chapterTexts[3] ?? "";
    const sample = splitIntoPassages(ch3).slice(0, 3);
    sample.forEach((p, i) => console.log(`\n  [${i + 1}] ${p.slice(0, 300)}…`));
    printSummary(totalPages, chapterTexts, skippedUnmappedPages, frontMatterPages, tooShortPages, warnedUnmapped);
    console.log("\n✓ Dry run complete — nothing written to DB");
    return;
  }

  // ── Optional: clear existing samacheer chunks for this subject+class ────────
  if (CLEAR_FIRST) {
    console.log("\nClearing existing samacheer_textbook chunks…");
    const { error } = await supabase
      .from("tamil_knowledge_chunks")
      .delete()
      .eq("source_type", "samacheer_textbook")
      .eq("subject", SUBJECT)
      .eq("class_level", CLASS_LEVEL);
    if (error) throw new Error("Clear failed: " + error.message);
    console.log("✓ Cleared");
  }

  // ── Insert passages ─────────────────────────────────────────────────────────
  console.log("\n── Inserting into DB ──────────────────────────────────");
  let totalInserted = 0;

  for (const [num, text] of Object.entries(chapterTexts)) {
    const n   = parseInt(num);
    const map = activeMap[n];
    const passages = splitIntoPassages(text);

    // Insert one set of chunks per DB chapter name so retrieval matches exactly
    for (const dbChapter of map.db_chapters) {
      const rows = passages.map((p) => ({
        source_type:       "samacheer_textbook",
        subject:           SUBJECT,
        chapter:           dbChapter,
        class_level:       CLASS_LEVEL,
        tamil_text:        p,
        english_reference: null,
        embedding:         null,    // no OpenAI — retrieval uses chapter filter
      }));

      // Batch insert (Supabase upsert supports arrays)
      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase.from("tamil_knowledge_chunks").insert(batch);
        if (error) throw new Error(`Insert failed (ch${n} → ${dbChapter}): ${error.message}`);
      }

      console.log(`  ✓ Ch${n} → "${dbChapter}": ${passages.length} passages`);
      totalInserted += passages.length;
    }
  }

  printSummary(totalPages, chapterTexts, skippedUnmappedPages, frontMatterPages, tooShortPages, warnedUnmapped);
  console.log(`\n✓ Done — ${totalInserted} passages stored in tamil_knowledge_chunks`);
  console.log(`  source_type : samacheer_textbook  subject : ${SUBJECT}  class_level : ${CLASS_LEVEL}`);
  await parser.destroy();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
