import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim()])
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. AI bank count
const { count: aiCount } = await sb.from("questions").select("id", { count:"exact", head:true })
  .eq("source","ai").is("centre_id",null);
console.log(`source='ai' count: ${aiCount}  (expect 3,604) ${aiCount === 3604 ? "✓" : "← PROBLEM"}`);

// 2. Spot-check 3 rows — confirm body/options populated, NOT body_en
const { data: rows } = await sb.from("questions")
  .select("id, subject, chapter, body, options, answer_index, body_en, options_en, status, language, source")
  .eq("source","pyq").eq("language","en").is("centre_id",null)
  .eq("status","live")
  .order("created_at", { ascending: false })
  .limit(3);

console.log(`\nSpot-check 3 recently imported rows:`);
for (const r of rows ?? []) {
  const bodyOk   = typeof r.body === "string" && r.body.length > 10;
  const optsOk   = Array.isArray(r.options) && r.options.length === 4 && r.options[0].length > 0;
  const bodyEnEmpty = !r.body_en || r.body_en.length === 0;
  console.log(`\n  id=${r.id}`);
  console.log(`  subject=${r.subject} | chapter=${r.chapter.slice(0,40)}`);
  console.log(`  body ok: ${bodyOk ? "✓" : "✗"}  (${String(r.body).slice(0,60)})`);
  console.log(`  options ok: ${optsOk ? "✓" : "✗"}  ${JSON.stringify(r.options?.slice(0,2))}...`);
  console.log(`  body_en empty: ${bodyEnEmpty ? "✓" : "WARNING — has content"}`);
  console.log(`  answer_index: ${r.answer_index}`);
}

// 3. Difficulty distribution summary
const { data: all } = await sb.from("questions")
  .select("subject, difficulty")
  .eq("source","pyq").eq("language","en").is("centre_id",null).eq("status","live");
const total = all?.length ?? 0;
const E = all?.filter(r=>r.difficulty==="Easy").length ?? 0;
const M = all?.filter(r=>r.difficulty==="Medium").length ?? 0;
const H = all?.filter(r=>r.difficulty==="Hard").length ?? 0;
const pct = n => Math.round(100*n/total);
console.log(`\nDifficulty spread (${total} rows):`);
console.log(`  Easy   ${E} (${pct(E)}%)`);
console.log(`  Medium ${M} (${pct(M)}%)`);
console.log(`  Hard   ${H} (${pct(H)}%)`);
console.log(`  (old import was 79% Medium — this should be clearly different)`);
