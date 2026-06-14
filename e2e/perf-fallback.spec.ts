import { test, expect } from "@playwright/test";

/**
 * Performance / progressive-enhancement guards for the marketing hero.
 *
 * The hero lazy-loads a WebGL scene (HeroScene3D) ONLY on capable, non-reduced-
 * motion devices; otherwise it shows the CSS aurora fallback (see
 * components/landing/CinematicBackground.tsx + useDeviceCapability.ts).
 */

test.describe("hero is progressively enhanced", () => {
  test("three.js is NOT in the initial /welcome HTML payload (lazy chunk)", async ({ request }) => {
    const res = await request.get("/welcome");
    expect(res.status()).toBe(200);
    const html = await res.text();
    // The 3D scene chunk must be code-split, never inlined into the document.
    expect(html.toLowerCase()).not.toContain("three.module");
    expect(html).not.toContain("@react-three");
  });

  test("under reduced-motion, the WebGL canvas does NOT mount (aurora fallback)", async ({ page }) => {
    // The whole suite runs reducedMotion: "reduce" → can3D is false.
    await page.goto("/welcome", { waitUntil: "domcontentloaded" });
    // Give any (incorrect) client upgrade a chance to mount.
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("first response is reasonably quick", async ({ page }) => {
    const start = Date.now();
    const res = await page.goto("/welcome", { waitUntil: "domcontentloaded" });
    const ms = Date.now() - start;
    expect(res?.status()).toBe(200);
    // Generous ceiling — flags only a gross regression, not micro-timing.
    expect(ms, `DOMContentLoaded took ${ms}ms`).toBeLessThan(8000);
  });
});
