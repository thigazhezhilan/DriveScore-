/**
 * NEET diagram-question pipeline (offline): crop each figure question's region
 * from the PDF (excluding the printed answer), upload it to Supabase Storage,
 * and insert it as an image question (answer from the parsed key).
 *
 * It crops the page region BETWEEN the question number and its "Solution:" line,
 * so the figure + options are captured but the answer is never shown.
 *
 * Usage:
 *   node scripts/extract-diagrams.mjs <paper.pdf> <review.csv> [q1,q2,...]
 *     - review.csv : the *.review.csv produced by extract-neet.mjs (has q_no,
 *                    page, subject, chapter, correct_option)
 *     - q-list     : optional; only these question numbers (else all rows that
 *                    have an answer). Use the list to avoid duplicating questions
 *                    already imported as text.
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from "node:fs";

const { PDFParse } = await import("pdf-parse");
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const { Jimp } = await import("jimp");
const { createClient } = await import("@supabase/supabase-js");
const Papa = (await import("papaparse")).default;
const { classifyChapter } = await import("./ncert-classify.mjs");

const [pdfPath, reviewPath, qListArg] = process.argv.slice(2);
if (!pdfPath || !reviewPath) {
  console.error("usage: node scripts/extract-diagrams.mjs <paper.pdf> <review.csv> [q1,q2,...]");
  process.exit(1);
}
const onlyQ = qListArg ? new Set(qListArg.split(",").map((s) => Number(s.trim()))) : null;
const BUCKET = "question-images";
const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 };

// ── env ──
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── rows to process ──
const rows = Papa.parse(fs.readFileSync(reviewPath, "utf8"), { header: true, skipEmptyLines: true }).data
  .filter((r) => r.correct_option && r.page) // need an answer + a page
  .filter((r) => !onlyQ || onlyQ.has(Number(r.q_no)));
if (rows.length === 0) { console.log("No matching rows."); process.exit(0); }

// ── load PDF once for coords + once for screenshots (separate buffers) ──
const raw = fs.readFileSync(pdfPath);
const doc = await pdfjs.getDocument({ data: Uint8Array.from(raw) }).promise;
const parser = new PDFParse({ data: Uint8Array.from(raw) });
const shot = await parser.getScreenshot({ scale: 2 });
const shotByPage = new Map(shot.pages.map((p) => [p.pageNumber, p]));

/** Crop the region of question `qNum` on `pageNum`, return a PNG Buffer. */
async function cropQuestion(pageNum, qNum) {
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: 1 });
  const items = (await page.getTextContent()).items.filter((i) => i.str.trim());
  const qItem = items.find((i) => new RegExp("^" + qNum + "\\.").test(i.str.trim()));
  if (!qItem) return null;
  const qY = qItem.transform[5];
  // First Solution/Answer line below the question (smaller y = lower on page).
  const sol = items.filter((i) => /^(Solution|Answer)/i.test(i.str.trim()) && i.transform[5] < qY)
    .sort((a, b) => b.transform[5] - a.transform[5])[0];
  const solY = sol ? sol.transform[5] : 0;

  // Bottom = just under the LAST real content line above the solution, so the
  // figure + all options are kept but the printed answer is never included.
  const isFooter = (s) => /vedantu|^\d{1,3}$|^\d+\s+of\s+\d+/i.test(s);
  const contentYs = items
    .filter((i) => i.transform[5] < qY && i.transform[5] > solY && !isFooter(i.str.trim()))
    .map((i) => i.transform[5]);
  const lastY = contentYs.length ? Math.min(...contentYs) : (sol ? solY + 16 : 0);

  const pg = shotByPage.get(pageNum);
  let buf = pg.data;
  if (!Buffer.isBuffer(buf) && pg.dataUrl) buf = Buffer.from(pg.dataUrl.split(",")[1], "base64");
  const img = await Jimp.fromBuffer(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
  const ratio = img.height / vp.height;
  const top = Math.max(0, Math.round((vp.height - qY) * ratio) - 18);
  let bot = Math.round((vp.height - lastY) * ratio) + 16; // include last line's descenders
  if (sol) bot = Math.min(bot, Math.round((vp.height - solY) * ratio) - 10); // stay above the answer
  bot = Math.min(img.height, bot);
  if (bot - top < 30) return null;
  img.crop({ x: 0, y: top, w: img.width, h: bot - top });
  return await img.getBuffer("image/png");
}

let added = 0;
const failed = [];
for (const r of rows) {
  const qNum = Number(r.q_no);
  try {
    const png = await cropQuestion(Number(r.page), qNum);
    if (!png) { failed.push(qNum + " (crop failed)"); continue; }
    const key = `${crypto.randomUUID()}.png`;
    const up = await supabase.storage.from(BUCKET).upload(key, png, { contentType: "image/png" });
    if (up.error) { failed.push(qNum + " (upload: " + up.error.message + ")"); continue; }
    const imageUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    // Chapter from the question STEM (the figure itself has no text), via the
    // shared NCERT classifier — keeps diagram questions in real chapters.
    const chap = classifyChapter(r.subject, r.question_text || "")
      || (r.chapter && !["General", "Diagram"].includes(r.chapter) ? r.chapter : "Unclassified");
    const ins = await supabase.from("questions").insert({
      centre_id: null,
      subject: r.subject,
      chapter: chap,
      concept: chap,
      difficulty: r.difficulty || "Medium",
      par_time_sec: Number(r.par_time_sec) || 90,
      text: "",
      options: ["", "", "", ""],
      answer_index: ANSWER_INDEX[r.correct_option.toUpperCase()] ?? 0,
      image_url: imageUrl,
    });
    if (ins.error) { failed.push(qNum + " (insert: " + ins.error.message + ")"); continue; }
    added++;
    console.log(`  Q${qNum} (${r.subject}) -> added`);
  } catch (e) {
    failed.push(qNum + " (" + e.message + ")");
  }
}
await parser.destroy();

console.log(`\nDiagram questions added: ${added}/${rows.length}`);
if (failed.length) console.log("Failed/skipped:", failed.join("; "));
