import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

/**
 * Playwright e2e config for DriveScore.
 *
 * - Loads `.env.local` so tests can read the seeded demo credentials
 *   (SEED_ADMIN_*, SEED_TEACHER_*, SEED_STUDENT_*) and Supabase keys.
 * - Boots the PRODUCTION build (`npm run start`) so tests exercise the same
 *   output that Vercel serves. Rebuild (`npm run build`) after code changes.
 * - Read-only/auth/redirect/security/a11y specs run by default. Data-MUTATING
 *   specs (under e2e/mutating) are gated behind RUN_MUTATING=1 so they never
 *   pollute the live demo database unless you opt in (ideally a throwaway DB).
 */

loadEnv({ path: ".env.local" });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Cap workers: authenticated specs render heavy server pages against a remote
  // Supabase; too many parallel logins cause contention/flake.
  workers: process.env.CI ? 1 : 3,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Run on the reduced-motion path: this is the lightweight CSS-aurora
    // fallback real low-power/reduced-motion users get (no WebGL hero), which
    // both validates that fallback and keeps headless software-GL from stalling.
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Only manage the server when pointing at localhost. If E2E_BASE_URL targets
  // a deployed URL, skip the local server entirely.
  webServer: BASE_URL.includes("127.0.0.1") || BASE_URL.includes("localhost")
    ? {
        command: "npm run start",
        url: BASE_URL,
        timeout: 120_000,
        // Always boot a fresh production server. Reusing a stray `next dev`
        // on :3000 serves dev-mode assets (and can be cache-corrupted by a
        // concurrent build), producing false 500s. Own the server instead.
        reuseExistingServer: false,
      }
    : undefined,
});
