/**
 * AI-bank progress tracker. Prints, per Physics chapter, how many non-hidden
 * AI-practice questions exist at each difficulty vs the 40/35/25 target (100).
 *
 * Usage: node scripts/bank-status.mjs [Physics|Chemistry|Biology]
 */
import fs from "node:fs";
import { CHAPTERS } from "./ncert-classify.mjs";

const SUBJECT = process.argv[2] || "Physics";
const TARGET = { Easy: 40, Medium: 35, Hard: 25 };

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Supabase caps a single select at 1000 rows — paginate so chapters past the
// 1000th AI question are still counted.
const data = [];
for (let from = 0; ; from += 1000) {
  const { data: page, error } = await sb.from("questions").select("chapter, difficulty")
    .is("centre_id", null).eq("source", "ai").eq("hidden", false).eq("subject", SUBJECT)
    .range(from, from + 999);
  if (error) { console.error("Fetch failed:", error.message); process.exit(1); }
  data.push(...(page || []));
  if (!page || page.length < 1000) break;
}

const counts = new Map(); // chapter -> {Easy,Medium,Hard}
for (const r of data) {
  if (!counts.has(r.chapter)) counts.set(r.chapter, { Easy: 0, Medium: 0, Hard: 0 });
  const c = counts.get(r.chapter);
  if (c[r.difficulty] !== undefined) c[r.difficulty]++;
}

let done = 0, total = 0, gTotal = 0;
console.log(`${SUBJECT} AI-bank vs target 40E/35M/25H = 100/chapter\n` + "─".repeat(64));
for (const ch of CHAPTERS[SUBJECT]) {
  const c = counts.get(ch) || { Easy: 0, Medium: 0, Hard: 0 };
  const sum = c.Easy + c.Medium + c.Hard;
  gTotal += sum; total += 100;
  const full = c.Easy >= TARGET.Easy && c.Medium >= TARGET.Medium && c.Hard >= TARGET.Hard;
  if (full) done++;
  const mark = full ? "✓" : " ";
  console.log(`${mark} ${ch.padEnd(46)} ${String(c.Easy).padStart(2)}/40 ${String(c.Medium).padStart(2)}/35 ${String(c.Hard).padStart(2)}/25  = ${String(sum).padStart(3)}/100`);
}
console.log("─".repeat(64));
console.log(`Chapters complete: ${done}/${CHAPTERS[SUBJECT].length}  ·  total questions: ${gTotal}/${total}`);
