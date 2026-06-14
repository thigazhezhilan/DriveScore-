import { test, expect } from "@playwright/test";

/**
 * Auth gate / redirect behaviour for logged-OUT visitors.
 *
 * Real behaviour (from lib/supabase/middleware.ts), which differs from the
 * original QA brief's "everything → /login":
 *   - Student routes (/, /test, /report, /progress, /practice) → /welcome
 *   - /admin and /teacher (exact) → PASS THROUGH (page shows its own login form)
 *   - /admin/* and /teacher/* sub-routes → redirect to /admin or /teacher
 *   - /login (retired) → /welcome
 */

test.describe("logged-out redirects", () => {
  const toWelcome = ["/", "/test", "/report", "/progress", "/practice", "/practice/climb"];

  for (const route of toWelcome) {
    test(`${route} → /welcome`, async ({ page }) => {
      // We only care about the final URL after the middleware redirect, not the
      // heavy hero rendering — commit as soon as the document lands.
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/welcome$/);
    });
  }

  test("/login (retired) → /welcome", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test("/admin shows the admin login form (no redirect)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("/teacher shows the teacher login form (no redirect)", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("/admin/centres/new (sub-route) → /admin", async ({ page }) => {
    await page.goto("/admin/centres/new");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("/teacher/mocks (sub-route) → /teacher", async ({ page }) => {
    await page.goto("/teacher/mocks");
    await expect(page).toHaveURL(/\/teacher$/);
  });
});
