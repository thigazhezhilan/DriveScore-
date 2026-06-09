/**
 * One-off: re-file every global question into its correct NCERT chapter using
 * the shared classifier. Subject is trusted (set by paper section); only the
 * chapter (+ concept mirror) is corrected. Eliminates "General"/"Diagram".
 *
 * Offline → no tokens.  Usage: node scripts/reclassify.mjs [--apply]
 *   (dry-run by default; pass --apply to write changes)
 */

import fs from "node:fs";
import { classifyChapter, CHAPTERS } from "./ncert-classify.mjs";

const apply = process.argv.includes("--apply");

// Canonical set + aliases for older hand-import names, used only when the
// classifier can't match (so an already-correct chapter is kept/normalised).
const CANON = new Set(Object.values(CHAPTERS).flat());
const ALIASES = {
  "Kinematics": "Motion in a Straight Line",
  "Atomic Structure": "Structure of Atom",
  "Cell Biology": "Cell: The Unit of Life",
  "Work Energy and Power": "Work, Energy and Power",
};
function fallback(existing) {
  const norm = ALIASES[existing] || existing;
  return CANON.has(norm) ? norm : null; // null = truly junk (General/Diagram/blank)
}
const { createClient } = await import("@supabase/supabase-js");
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: qs, error } = await sb
  .from("questions")
  .select("id, subject, text, options, chapter")
  .is("centre_id", null);
if (error) throw error;

let changed = 0, unmatched = 0;
const unmatchedList = [];
const dist = {};
for (const q of qs) {
  const hay = [q.text, ...(Array.isArray(q.options) ? q.options : [])].join(" ");
  const chapter = classifyChapter(q.subject, hay) || fallback(q.chapter);
  if (!chapter) {
    unmatched++;
    unmatchedList.push(`${q.id} | ${q.subject} | ${q.chapter} | ${(q.text || "").slice(0, 45)}`);
    continue;
  }
  dist[q.subject + " · " + chapter] = (dist[q.subject + " · " + chapter] || 0) + 1;
  if (chapter !== q.chapter) {
    changed++;
    if (apply) {
      const { error: uErr } = await sb.from("questions")
        .update({ chapter, concept: chapter }).eq("id", q.id);
      if (uErr) console.log("update err", q.id, uErr.message);
    }
  }
}

console.log(`${apply ? "APPLIED" : "DRY RUN"} — total ${qs.length}, would change ${changed}, unmatched ${unmatched}`);
console.log("\nChapter distribution (after classify):");
Object.entries(dist).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => console.log(`  ${v}\t${k}`));
if (unmatchedList.length) {
  console.log(`\nUNMATCHED (${unmatchedList.length}) — need a keyword:`);
  unmatchedList.forEach((u) => console.log("  " + u));
}
