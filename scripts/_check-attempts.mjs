/**
 * Check whether the 3,576 answers referencing pyq questions are from
 * real students or seeded/test attempts.
 */
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Collect attempt_ids from the pyq answer rows
const { data: qRows } = await sb.from("questions").select("id")
  .eq("source", "pyq").eq("language", "en").is("centre_id", null);
const qIds = qRows.map(r => r.id);

const attemptIds = new Set();
for (let i = 0; i < qIds.length; i += 50) {
  const { data } = await sb.from("answers").select("attempt_id").in("question_id", qIds.slice(i, i+50)).limit(500);
  (data ?? []).forEach(r => attemptIds.add(r.attempt_id));
}
console.log(`Unique attempt_ids from pyq answers: ${attemptIds.size}`);

// Probe the attempts table schema + sample
const { data: atSample, error: atErr } = await sb.from("attempts").select("*").limit(2);
if (atErr) { console.error("attempts query:", atErr.message); process.exit(1); }
console.log("attempts columns:", Object.keys(atSample?.[0] ?? {}));

// Fetch the actual attempt rows
const attArr = [...attemptIds];
let realAttempts = [];
for (let i = 0; i < attArr.length; i += 50) {
  const { data } = await sb.from("attempts").select("*").in("id", attArr.slice(i, i+50)).limit(200);
  realAttempts.push(...(data ?? []));
}
console.log(`\nAttempt rows fetched: ${realAttempts.length}`);
if (realAttempts.length > 0) {
  console.log("First attempt:", JSON.stringify(realAttempts[0], null, 2));
  // Unique users
  const cols = Object.keys(realAttempts[0]);
  const userCol = cols.find(c => c.includes("user") || c.includes("student") || c.includes("profile"));
  if (userCol) {
    const users = new Set(realAttempts.map(r => r[userCol]));
    console.log(`\nUnique ${userCol}: ${users.size}`);
    console.log("Sample:", [...users].slice(0, 5));
  }
}
