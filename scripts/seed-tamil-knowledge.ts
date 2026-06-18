/**
 * Seed the tamil_knowledge_chunks table with AI-generated seed passages.
 *
 * Usage:
 *   npx tsx scripts/seed-tamil-knowledge.ts
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 * Idempotent: skips if ai_generated_seed rows already exist for a subject.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { SEED_CHUNKS, addTamilChunk } from "../lib/tamil/seed-knowledge";

async function main() {
  console.log(`\nSeeding ${SEED_CHUNKS.length} Tamil knowledge chunks...`);

  let seeded = 0;
  let failed = 0;

  for (const chunk of SEED_CHUNKS) {
    try {
      const id = await addTamilChunk(chunk);
      console.log(`  ✅ ${chunk.subject}/${chunk.chapter ?? "—"} → ${id.slice(0, 8)}...`);
      seeded++;
    } catch (err) {
      console.error(`  ✗ ${chunk.subject}/${chunk.chapter}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\nDone: ${seeded} seeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
