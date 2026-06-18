/**
 * CLI entry point for the Tamil translation agent.
 *
 * Usage:
 *   # Single question:
 *   npx tsx scripts/tamil-translate.ts --id <uuid>
 *
 *   # Batch by filter:
 *   npx tsx scripts/tamil-translate.ts --subject Physics --status none --limit 50
 *   npx tsx scripts/tamil-translate.ts --subject Biology --limit 20
 *
 *   # Batch specific IDs:
 *   npx tsx scripts/tamil-translate.ts --ids uuid1,uuid2,uuid3
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                      OPENAI_API_KEY, ANTHROPIC_API_KEY
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { translateQuestionById, translateBatch } from "../lib/tamil/agent";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.id) {
    // Single question
    console.log(`\nTranslating question: ${args.id}`);
    const result = await translateQuestionById(args.id);
    console.log("\nResult:");
    console.log(`  Status:    ${result.status}`);
    console.log(`  Score:     ${result.score ?? "—"}`);
    if (result.failedChecks.length > 0) {
      console.log(`  Failed:    ${result.failedChecks.join(", ")}`);
    }
    if (result.criticalFailures.length > 0) {
      console.log(`  CRITICAL:  ${result.criticalFailures.join(", ")}`);
    }
    if (result.errorMessage) {
      console.log(`  Error:     ${result.errorMessage}`);
    }
    process.exit(result.status === "error" ? 1 : 0);
  }

  if (args.ids) {
    // Batch specific IDs
    const ids = args.ids.split(",").map((id) => id.trim()).filter(Boolean);
    console.log(`\nTranslating ${ids.length} specified questions...`);
    await translateBatch({ ids });
    return;
  }

  // Batch by filter
  const subject = args.subject;
  const tamil_status = args.status ?? "none";
  const limit = args.limit ? parseInt(args.limit, 10) : 50;

  console.log(`\nBatch translation:`);
  if (subject) console.log(`  Subject: ${subject}`);
  console.log(`  Status:  ${tamil_status}`);
  console.log(`  Limit:   ${limit}`);

  await translateBatch({ subject, tamil_status, limit });
}

main().catch((err) => {
  console.error("\n[tamil-translate] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
