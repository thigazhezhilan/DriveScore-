/**
 * Attach a confirmed image and promote a draft diagram question to live
 * — Step 4 of the diagram lane.
 *
 * STATUS RULE (non-negotiable):
 *   A diagram question NEVER flips to 'live' without a confirmed, non-null
 *   image_url. This script refuses to promote any row for which the image
 *   file is missing or the DB row would end up with image_url = null.
 *
 * Reads:
 *   <draft-ids.json>  — maps q_no → {db_id, page} (written by import-diagram-pyq.mjs)
 *   <review-dir>/     — folder with q{n}-auto.png or q{n}-approved.png images
 *                       and manifest.json (written by extract-diagram-images.mjs)
 *
 * For each target question it:
 *   1. Locates the confirmed image file (q{n}-auto.png or q{n}-approved.png)
 *   2. Uploads it to the question-images Supabase Storage bucket
 *   3. Updates the DB row: sets image_url + flips status='draft' → 'live'
 *   4. Updates manifest.json promoted=true for that entry
 *
 * Usage:
 *   node scripts/promote-diagram-pyq.mjs <draft-ids.json> <review-dir/> --auto
 *   node scripts/promote-diagram-pyq.mjs <draft-ids.json> <review-dir/> --q=1,3,5
 *   node scripts/promote-diagram-pyq.mjs <draft-ids.json> <review-dir/> --all
 *
 * Flags:
 *   --auto   Process only questions where manifest.method = 'auto'
 *   --q=1,5  Process only these question numbers
 *   --all    Process all questions that have a confirmed image file
 *
 * Image file lookup (in priority order for each q_no):
 *   1. q{n}-approved.png  — human-confirmed crop from a manual-render page
 *   2. q{n}-auto.png      — auto-cropped by extract-diagram-images.mjs
 *
 * After running, a final sanity check confirms no live diagram row in the bank
 * has a null image_url.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BUCKET = "question-images";

// ── Args ──────────────────────────────────────────────────────────────────────

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [draftIdsPath, reviewDir] = positional;
if (!draftIdsPath || !reviewDir) {
  console.error(
    "usage: node scripts/promote-diagram-pyq.mjs <draft-ids.json> <review-dir/> [--auto | --q=1,3 | --all]",
  );
  process.exit(1);
}

const modeAuto = process.argv.includes("--auto");
const modeAll  = process.argv.includes("--all");
const qArg = process.argv.find((a) => a.startsWith("--q="))?.slice(4) ?? null;
const targetQs = qArg ? new Set(qArg.split(",").map(Number)) : null;

if (!modeAuto && !modeAll && !targetQs) {
  console.error("Specify --auto, --all, or --q=<list>. Nothing to do.");
  process.exit(1);
}

// ── Load files ────────────────────────────────────────────────────────────────

const draftIds = JSON.parse(fs.readFileSync(draftIdsPath, "utf8"));
const manifestPath = path.join(reviewDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// ── Env + DB ─────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── Determine which questions to promote ──────────────────────────────────────

function imageFor(qNo) {
  const approved = path.join(reviewDir, `q${qNo}-approved.png`);
  const auto     = path.join(reviewDir, `q${qNo}-auto.png`);
  if (fs.existsSync(approved)) return approved;
  if (fs.existsSync(auto))     return auto;
  return null;
}

const targets = manifest.filter((entry) => {
  if (entry.promoted) return false; // already done
  const qNo = entry.q_no;
  if (!draftIds[qNo]) return false; // not in our draft batch
  if (targetQs) return targetQs.has(qNo);
  if (modeAuto) return entry.method === "auto";
  return true; // --all
});

if (targets.length === 0) {
  console.log("No promotable entries found (all already promoted, or no matching filter).");
  process.exit(0);
}

// Pre-flight: verify every target has an image file before touching the DB.
const missing = targets.filter((e) => !imageFor(e.q_no));
if (missing.length > 0) {
  console.error(`\nABORTED — missing image files for ${missing.length} question(s):`);
  missing.forEach((e) => {
    console.error(`  Q${e.q_no} — expected q${e.q_no}-approved.png or q${e.q_no}-auto.png in ${reviewDir}`);
  });
  console.error(`\nPlace a confirmed image for each question then re-run.`);
  process.exit(1);
}

if (modeAuto) {
  console.log(
    "\n⚠  --auto reminder: height ≥ 60px confirms a crop succeeded, not that it's correct.\n" +
    "   Eyeball every q{n}-auto.png in the review folder against its stem before\n" +
    "   continuing — a mis-cropped circuit that looks authoritative is worse than\n" +
    "   no question. Ctrl-C now if you haven't done that glance yet.\n"
  );
}

console.log(`Promoting ${targets.length} diagram question(s)…`);

// ── Promote each question ─────────────────────────────────────────────────────

let promoted = 0;
const failed = [];

for (const entry of targets) {
  const qNo = entry.q_no;
  const { db_id } = draftIds[qNo];
  const imgPath = imageFor(qNo);

  try {
    // 1. Read image bytes
    const bytes = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).slice(1) || "png";
    const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

    // 2. Upload to storage bucket
    const key = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(key, bytes, { contentType, upsert: false });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    const imageUrl = sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    if (!imageUrl) throw new Error("storage returned null publicUrl");

    // 3. Update the DB row: image_url + status='live'
    const { error: updateErr } = await sb
      .from("questions")
      .update({ image_url: imageUrl, status: "live" })
      .eq("id", db_id)
      .eq("status", "draft") // guard: only touch draft rows
      .is("centre_id", null);
    if (updateErr) throw new Error(`update: ${updateErr.message}`);

    // 4. Mark as promoted in our local manifest
    entry.promoted = true;
    entry.promoted_image_url = imageUrl;

    promoted++;
    console.log(`  Q${qNo} [${entry.subject}] → live  (${path.basename(imgPath)})`);
  } catch (e) {
    failed.push({ qNo, error: e.message });
    console.error(`  Q${qNo} FAILED: ${e.message}`);
  }
}

// Persist updated manifest (marks promoted=true so re-running is idempotent)
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// ── Final sanity: no live diagram row with null image_url ─────────────────────

console.log(`\n─── Post-promotion sanity check ───`);
const { data: badRows, error: sanErr } = await sb
  .from("questions")
  .select("id, chapter, subject")
  .is("centre_id", null)
  .eq("source", "pyq")
  .eq("language", "en")
  .eq("status", "live")
  .is("image_url", null)
  .not("body", "eq", "")    // text questions have body; image questions have empty body
  .limit(10);

// A live PYQ row with null image_url AND empty body is a broken image question.
// (Text questions have non-empty body, so filtering body='' isolates image rows.)
const { data: badImageRows, error: sanErr2 } = await sb
  .from("questions")
  .select("id, chapter, subject, body")
  .is("centre_id", null)
  .eq("source", "pyq")
  .eq("language", "en")
  .eq("status", "live")
  .is("image_url", null)
  .eq("body", "")
  .limit(10);

if (sanErr2) {
  console.warn("  (sanity query failed:", sanErr2.message, ")");
} else if ((badImageRows ?? []).length > 0) {
  console.error(`  ✗ CRITICAL: ${badImageRows.length} live diagram row(s) have null image_url!`);
  badImageRows.forEach((r) =>
    console.error(`    id=${r.id}  ${r.subject} / ${r.chapter}`),
  );
  console.error("  These questions are broken — students cannot see them.");
  process.exit(1);
} else {
  console.log(`  ✓ No live diagram rows with null image_url`);
}

// ── Report ────────────────────────────────────────────────────────────────────

const total = manifest.length;
const totalPromoted = manifest.filter((e) => e.promoted).length;
const stillDraft = total - totalPromoted;

console.log(`\nPromotion summary:`);
console.log(`  Promoted this run : ${promoted}`);
console.log(`  Failed this run   : ${failed.length}`);
console.log(`  Total promoted    : ${totalPromoted} / ${total}`);
console.log(`  Still draft       : ${stillDraft}`);

if (stillDraft > 0) {
  const pending = manifest.filter((e) => !e.promoted);
  console.log(`\n  Questions still draft (need confirmed image):`);
  pending.forEach((e) => {
    const hasImg = imageFor(e.q_no) !== null;
    console.log(`    Q${e.q_no} [${e.subject}] method=${e.method}  image=${hasImg ? "present" : "MISSING"}`);
  });
}

if (failed.length > 0) {
  console.log(`\nFailed questions:`);
  failed.forEach(({ qNo, error }) => console.log(`  Q${qNo}: ${error}`));
  process.exit(1);
}
