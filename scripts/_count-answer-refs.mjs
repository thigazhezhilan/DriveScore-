import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: qRows } = await sb
  .from("questions")
  .select("id")
  .eq("source", "pyq").eq("language", "en").is("centre_id", null);
const ids = qRows.map(r => r.id);
console.log(`pyq/en question IDs: ${ids.length}`);

// Batch count in chunks of 50
let total = 0;
let sampleRows = [];
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const { data, error } = await sb
    .from("answers")
    .select("id, attempt_id, question_id, picked_index")
    .in("question_id", chunk)
    .limit(500);
  if (error) { console.error("batch error:", error.message); continue; }
  total += (data ?? []).length;
  if (sampleRows.length < 5) sampleRows.push(...(data ?? []).slice(0, 5 - sampleRows.length));
}

console.log(`\nAnswers referencing pyq/en questions (batched, limit 500/chunk): ${total}`);
console.log(`\nSample answers rows:`);
sampleRows.forEach(r => console.log(`  answer=${r.id}  attempt=${r.attempt_id}  q=${r.question_id}  picked=${r.picked_index}`));
