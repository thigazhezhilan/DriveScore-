/**
 * NEET diagram image extraction — Step 2 of the diagram lane.
 *
 * For each figure question in <paper>.needs-image.csv, attempts to auto-crop
 * the question region from the PDF using coordinate-based detection (finds the
 * question-number marker and the "Solution:" line, then crops between them).
 * Falls back to a full-page render when auto-crop fails (e.g. the question
 * marker can't be located in the text layer).
 *
 * Auto vs manual:
 *   auto   – crop succeeded and the cropped height ≥ 60 px  → q{n}-auto.png
 *   manual – crop failed or was too small → full page render → q{n}-manual.png
 *            (the human marks the relevant region and saves as q{n}-approved.png
 *             before running promote-diagram-pyq.mjs)
 *
 * Output: <paper>-diagram-review/ folder containing:
 *   - q{n}-auto.png   or q{n}-manual.png for each question
 *   - manifest.json   mapping q_no → {method, image_file, subject, chapter,
 *                     page, stem, correct_option, options}
 *
 * Usage:
 *   node scripts/extract-diagram-images.mjs <paper.pdf> <paper.needs-image.csv>
 *   node scripts/extract-diagram-images.mjs docs/papers/neet-2015.pdf docs/papers/neet-2015.needs-image.csv
 *
 * Accepts the old review.csv format too — it will filter for reason="figure/parse"
 * rows automatically.
 */

import fs from "node:fs";
import path from "node:path";

const { PDFParse } = await import("pdf-parse");
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const { Jimp } = await import("jimp");
const Papa = (await import("papaparse")).default;

const [pdfPath, csvPath] = process.argv.slice(2);
if (!pdfPath || !csvPath) {
  console.error("usage: node scripts/extract-diagram-images.mjs <paper.pdf> <paper.needs-image.csv>");
  process.exit(1);
}

const csvStem = csvPath.replace(/\.(needs-image|review)\.csv$/i, "");
const reviewDir = csvStem + "-diagram-review";

// ── Load rows ─────────────────────────────────────────────────────────────────

const allRows = Papa.parse(fs.readFileSync(csvPath, "utf8"), {
  header: true,
  skipEmptyLines: "greedy",
  transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
}).data;

// Accept both the new needs-image.csv (no reason column) and the old review.csv
// (has reason column). Filter for figure rows when the reason column is present.
const rows = allRows.filter((r) => {
  if ("reason" in r) return r.reason === "figure/parse";
  return true;
}).filter((r) => r.q_no && r.page && r.correct_option);

if (rows.length === 0) {
  console.log("No figure question rows found in", csvPath);
  process.exit(0);
}

console.log(`Processing ${rows.length} diagram questions from ${path.basename(csvPath)}`);

// ── Load PDF ─────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(pdfPath);
const doc = await pdfjs.getDocument({ data: Uint8Array.from(raw) }).promise;
const parser = new PDFParse({ data: Uint8Array.from(raw) });

// Render only the pages that have figure questions (faster than rendering all)
const pages = [...new Set(rows.map((r) => Number(r.page)).filter(Boolean))].sort((a, b) => a - b);
const shot = await parser.getScreenshot({ pages: pages.join(","), scale: 2 });
const shotByPage = new Map((shot.pages ?? []).map((p) => [p.pageNumber, p]));

// ── Crop helper (same approach as extract-diagrams.mjs) ──────────────────────

async function cropQuestion(pageNum, qNum) {
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: 1 });
  const items = (await page.getTextContent()).items.filter((i) => i.str.trim());

  const qItem = items.find((i) => new RegExp("^" + qNum + "\\.").test(i.str.trim()));
  if (!qItem) return null;
  const qY = qItem.transform[5];

  const sol = items
    .filter((i) => /^(Solution|Answer)/i.test(i.str.trim()) && i.transform[5] < qY)
    .sort((a, b) => b.transform[5] - a.transform[5])[0];
  const solY = sol ? sol.transform[5] : 0;

  const isFooter = (s) => /vedantu|^\d{1,3}$|^\d+\s+of\s+\d+/i.test(s);
  const contentYs = items
    .filter((i) => i.transform[5] < qY && i.transform[5] > solY && !isFooter(i.str.trim()))
    .map((i) => i.transform[5]);
  const lastY = contentYs.length ? Math.min(...contentYs) : (sol ? solY + 16 : 0);

  const pg = shotByPage.get(pageNum);
  if (!pg) return null;
  let buf = pg.data;
  if (!Buffer.isBuffer(buf) && pg.dataUrl) buf = Buffer.from(pg.dataUrl.split(",")[1], "base64");
  const img = await Jimp.fromBuffer(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
  const ratio = img.height / vp.height;
  const top = Math.max(0, Math.round((vp.height - qY) * ratio) - 18);
  let bot = Math.round((vp.height - lastY) * ratio) + 16;
  if (sol) bot = Math.min(bot, Math.round((vp.height - solY) * ratio) - 10);
  bot = Math.min(img.height, bot);
  if (bot - top < 60) return null; // too small — likely a mis-detected marker
  img.crop({ x: 0, y: top, w: img.width, h: bot - top });
  return await img.getBuffer("image/png");
}

// ── Full-page render helper ───────────────────────────────────────────────────

async function fullPage(pageNum) {
  const pg = shotByPage.get(pageNum);
  if (!pg) return null;
  let buf = pg.data;
  if (!Buffer.isBuffer(buf) && pg.dataUrl) buf = Buffer.from(pg.dataUrl.split(",")[1], "base64");
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

// ── Process each row ─────────────────────────────────────────────────────────

fs.mkdirSync(reviewDir, { recursive: true });

const manifest = [];
let autoCount = 0, manualCount = 0;

for (const r of rows) {
  const qNum = Number(r.q_no);
  const pageNum = Number(r.page);
  const stem = String(r.question_text || "").trim();

  let png = null;
  let method = "manual";
  let imageFile = `q${qNum}-manual.png`;

  try {
    png = await cropQuestion(pageNum, qNum);
    if (png) {
      method = "auto";
      imageFile = `q${qNum}-auto.png`;
      autoCount++;
    } else {
      png = await fullPage(pageNum);
      manualCount++;
    }
  } catch {
    png = await fullPage(pageNum);
    manualCount++;
  }

  if (png) {
    fs.writeFileSync(path.join(reviewDir, imageFile), png);
  } else {
    imageFile = null;
    console.warn(`  Q${qNum}: could not render page ${pageNum}`);
  }

  manifest.push({
    q_no: qNum,
    subject: r.subject,
    chapter: r.chapter,
    difficulty: r.difficulty || "",
    page: pageNum,
    method,
    image_file: imageFile,
    stem: stem.slice(0, 120),
    options: {
      A: String(r.option_a || ""),
      B: String(r.option_b || ""),
      C: String(r.option_c || ""),
      D: String(r.option_d || ""),
    },
    correct_option: String(r.correct_option || "").toUpperCase(),
    promoted: false,
  });

  console.log(`  Q${qNum} (${r.subject}) → ${method}: ${imageFile ?? "FAILED"}`);
}

fs.writeFileSync(
  path.join(reviewDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

await parser.destroy();

console.log(`\nDiagram review folder: ${reviewDir}/`);
console.log(`  Auto-cropped : ${autoCount}`);
console.log(`  Full page    : ${manualCount}  (rename to q{n}-approved.png after cropping)`);
console.log(`  manifest.json written (${manifest.length} entries)`);
console.log(`\nNext: run import-diagram-pyq.mjs to insert as draft, then`);
console.log(`      promote-diagram-pyq.mjs to attach confirmed images.`);
