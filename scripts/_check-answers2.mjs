/**
 * Deeper audit of the answers rows blocking the delete.
 * Uses batched IN queries to avoid limit issues.
 */
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Fetch question IDs in small batches to avoid URL length limits
const { data: qRows } = await sb
  .from("questions")
  .select("id")
  .eq("source", "pyq").eq("language", "en").is("centre_id", null);
const ids = qRows.map(r => r.id);
console.log(`Question IDs: ${ids.length}`);

// Batch .in() in chunks of 50 to avoid Supabase URL limits
let totalAnswers = 0;
let earliestDate = null;
let latestDate = null;
let sampleRows = [];

for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const { data, error } = await sb
    .from("answers")
    .select("id, question_id, created_at, user_id")
    .in("question_id", chunk)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) { console.error("batch error:", error.message); continue; }
  totalAnswers += (data ?? []).length;
  for (const r of data ?? []) {
    if (!earliestDate || r.created_at < earliestDate) earliestDate = r.created_at;
    if (!latestDate   || r.created_at > latestDate)   latestDate   = r.created_at;
    if (sampleRows.length < 5) sampleRows.push(r);
  }
}

console.log(`\nTotal answers rows (batched): ${totalAnswers}`);
console.log(`Earliest: ${earliestDate}`);
console.log(`Latest  : ${latestDate}`);
console.log(`\nSample rows:`);
sampleRows.forEach(r => console.log(`  ${r.id}  q=${r.question_id}  user=${r.user_id}  ${r.created_at}`));

// Also count unique users who answered
const uniqueUsers = new Set();
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const { data } = await sb.from("answers").select("user_id").in("question_id", chunk).limit(1000);
  (data ?? []).forEach(r => uniqueUsers.add(r.user_id));
}
console.log(`\nUnique user IDs: ${uniqueUsers.size}`);
