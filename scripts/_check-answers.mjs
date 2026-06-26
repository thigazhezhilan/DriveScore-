/**
 * Audit the answers rows that reference the 358 old pyq/en questions.
 * Reports count, sample rows, and what tables reference questions.
 */
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Get IDs of all 358 pyq/en questions
const { data: qRows, error: qErr } = await sb
  .from("questions")
  .select("id")
  .eq("source", "pyq").eq("language", "en").is("centre_id", null);
if (qErr) { console.error(qErr.message); process.exit(1); }
const ids = qRows.map(r => r.id);
console.log(`pyq/en question IDs: ${ids.length}`);

// Count answers referencing these questions
const { count, error: aErr } = await sb
  .from("answers")
  .select("id", { count: "exact", head: true })
  .in("question_id", ids);
if (aErr) { console.error("answers query:", aErr.message); process.exit(1); }
console.log(`answers rows referencing these questions: ${count}`);

// Sample a few
if (count > 0) {
  const { data: sample } = await sb
    .from("answers")
    .select("id, question_id, created_at")
    .in("question_id", ids)
    .limit(5);
  console.log("\nSample answers rows:");
  (sample ?? []).forEach(r => console.log(`  ${r.id}  q=${r.question_id}  created=${r.created_at}`));
}
