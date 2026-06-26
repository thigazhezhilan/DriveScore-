import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Fetch a few rows from answers to see what columns exist
const { data, error } = await sb.from("answers").select("*").limit(3);
if (error) { console.error(error.message); process.exit(1); }
console.log("answers columns:", data?.length ? Object.keys(data[0]) : "no rows");
console.log("sample:", JSON.stringify(data?.[0] ?? {}, null, 2));

// Count total answers
const { count } = await sb.from("answers").select("id", { count: "exact", head: true });
console.log("total answers rows:", count);
