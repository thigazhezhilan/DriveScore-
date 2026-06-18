/**
 * Seed demo students for language-lock testing.
 *
 * Creates three accounts in the first available centre:
 *   1. Demo student (English, locked)   — SEED_LANG_EN_EMAIL / SEED_LANG_EN_PASSWORD
 *   2. Demo student (Tamil, locked)     — SEED_LANG_TA_EMAIL / SEED_LANG_TA_PASSWORD
 *   3. Demo student (null language)     — SEED_LANG_NULL_EMAIL / SEED_LANG_NULL_PASSWORD
 *      (used by the e2e gate test — simulates a brand-new first-login)
 *
 * Run after applying migrations 0017–0019:
 *   npx tsx scripts/seed-language-demo.ts
 *
 * Idempotent: existing accounts are skipped (checked by email before creation).
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function findOrCreateStudent(params: {
  email: string;
  password: string;
  fullName: string;
  centreId: string;
  preferredLanguage: "en" | "ta" | null;
}): Promise<void> {
  // Check if user already exists.
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingList?.users.find(
    (u) => u.email?.toLowerCase() === params.email.toLowerCase(),
  );

  let userId: string;

  if (existing) {
    console.log(`  [skip] ${params.email} already exists`);
    userId = existing.id;
  } else {
    // Create auth user (pre-confirmed so they can log in immediately).
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: { full_name: params.fullName },
    });
    if (cErr) throw cErr;
    userId = created.user.id;
    console.log(`  [create] ${params.email} (${userId})`);
  }

  // Upsert profile — preferred_language may be null (gate demo) or a real value.
  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role: "student",
      centre_id: params.centreId,
      full_name: params.fullName,
      preferred_language: params.preferredLanguage,
    },
    { onConflict: "id" },
  );
  // The immutability trigger fires only on UPDATE where the old value is non-null.
  // upsert on existing rows: if preferred_language is already set to the same value
  // the trigger allows it (DISTINCT FROM = false); if it tries to change a locked
  // value the trigger raises an exception — that's expected and is the correct
  // behaviour (the seed is idempotent for re-runs).
  if (pErr && !pErr.message?.includes("locked")) throw pErr;

  // Ensure a students row exists.
  const { data: sRow } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!sRow) {
    const { error: sErr } = await supabase.from("students").insert({
      centre_id: params.centreId,
      name: params.fullName,
      profile_id: userId,
    });
    if (sErr) throw sErr;
  }
}

async function main() {
  // Validate required env vars.
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SEED_LANG_EN_EMAIL",
    "SEED_LANG_EN_PASSWORD",
    "SEED_LANG_TA_EMAIL",
    "SEED_LANG_TA_PASSWORD",
    "SEED_LANG_NULL_EMAIL",
    "SEED_LANG_NULL_PASSWORD",
  ];
  for (const v of required) {
    if (!process.env[v]) throw new Error(`Missing env var: ${v}`);
  }

  // Use the first centre in the DB (any seeded centre works for demo purposes).
  const { data: centres, error: cErr } = await supabase
    .from("centres")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (cErr) throw cErr;
  if (!centres?.length) {
    throw new Error(
      "No centres found. Run `npm run db:seed` first to create at least one centre.",
    );
  }
  const centreId = centres[0].id;
  console.log(`Using centre: ${centres[0].name} (${centreId})`);

  console.log("\nSeeding English demo student...");
  await findOrCreateStudent({
    email: process.env.SEED_LANG_EN_EMAIL!,
    password: process.env.SEED_LANG_EN_PASSWORD!,
    fullName: "Demo English Student",
    centreId,
    preferredLanguage: "en",
  });

  console.log("Seeding Tamil demo student...");
  await findOrCreateStudent({
    email: process.env.SEED_LANG_TA_EMAIL!,
    password: process.env.SEED_LANG_TA_PASSWORD!,
    fullName: "Demo Tamil Student",
    centreId,
    preferredLanguage: "ta",
  });

  console.log("Seeding null-language demo student (gate test)...");
  await findOrCreateStudent({
    email: process.env.SEED_LANG_NULL_EMAIL!,
    password: process.env.SEED_LANG_NULL_PASSWORD!,
    fullName: "Demo Gate Student",
    centreId,
    preferredLanguage: null,
  });

  console.log("\nDone. Add these to .env.local for e2e tests:");
  console.log(`  SEED_LANG_EN_EMAIL=${process.env.SEED_LANG_EN_EMAIL}`);
  console.log(`  SEED_LANG_EN_PASSWORD=${process.env.SEED_LANG_EN_PASSWORD}`);
  console.log(`  SEED_LANG_TA_EMAIL=${process.env.SEED_LANG_TA_EMAIL}`);
  console.log(`  SEED_LANG_TA_PASSWORD=${process.env.SEED_LANG_TA_PASSWORD}`);
  console.log(`  SEED_LANG_NULL_EMAIL=${process.env.SEED_LANG_NULL_EMAIL}`);
  console.log(`  SEED_LANG_NULL_PASSWORD=${process.env.SEED_LANG_NULL_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
