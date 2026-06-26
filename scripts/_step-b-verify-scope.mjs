/**
 * STEP B — read-only scope verification.
 * Confirms the delete predicate (source='pyq' AND language='en' AND centre_id IS NULL)
 * catches exactly 358 rows and zero source='ai' rows.
 */
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].trim()])
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Count rows that match the exact delete predicate
const { count: deleteTarget, error: e1 } = await sb
  .from("questions")
  .select("id", { count: "exact", head: true })
  .eq("source","pyq").eq("language","en").is("centre_id",null);
if (e1) { console.error(e1.message); process.exit(1); }

// Count source='ai' rows that would be caught by the same WHERE (should be impossible
// since source can't be both 'pyq' and 'ai', but verify explicitly)
const { count: aiAffected, error: e2 } = await sb
  .from("questions")
  .select("id", { count: "exact", head: true })
  .eq("source","ai").eq("language","en").is("centre_id",null)
  .in("id",
    // cross-check: fetch IDs matched by the pyq predicate and ask if any are source='ai'
    // Since source is a single column this will always be 0, but we prove it explicitly.
    (await sb.from("questions").select("id")
      .eq("source","pyq").eq("language","en").is("centre_id",null)
    ).data?.map(r => r.id) ?? []
  );
if (e2) { console.error(e2.message); process.exit(1); }

// Total ai rows in the bank — must be unchanged after the delete
const { count: aiTotal, error: e3 } = await sb
  .from("questions")
  .select("id", { count: "exact", head: true })
  .eq("source","ai").is("centre_id",null);
if (e3) { console.error(e3.message); process.exit(1); }

console.log(`Delete predicate (source=pyq, language=en, centre_id IS NULL):`);
console.log(`  Rows matched           : ${deleteTarget}   (expect 358)`);
console.log(`\nAI rows affected by that predicate : ${aiAffected}   (must be 0)`);
console.log(`Total source='ai' rows in bank     : ${aiTotal}   (will remain untouched)`);

if (deleteTarget !== 358) {
  console.error(`\nSTOP — delete target is ${deleteTarget}, not 358. Investigate before proceeding.`);
  process.exit(1);
}
if (aiAffected !== 0) {
  console.error(`\nSTOP — AI rows would be affected (${aiAffected}). Something is wrong with the filter.`);
  process.exit(1);
}
console.log(`\nSTEP B: scope verified ✓  Safe to proceed to STEP C.`);
