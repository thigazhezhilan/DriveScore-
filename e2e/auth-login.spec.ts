import { test, expect } from "@playwright/test";
import { login, credsFor, hasCreds } from "./helpers/auth";

/**
 * Login + role-routing + role isolation.
 *
 * Read-only against the live Supabase (signInWithPassword + navigation): no
 * data is written. Requires SEED_* creds in .env.local; individual tests skip
 * cleanly if a credential is missing.
 *
 * Landing routes: admin → /admin, teacher → /teacher, student → /.
 */

test.describe("login routes each role to its landing page", () => {
  test("admin → /admin", async ({ page }) => {
    test.skip(!hasCreds("admin"), "SEED_ADMIN_* not set");
    await login(page, "admin");
    await expect(page.getByText(/operations dashboard/i)).toBeVisible();
  });

  test("teacher → /teacher", async ({ page }) => {
    test.skip(!hasCreds("teacher"), "SEED_TEACHER_* not set");
    await login(page, "teacher");
  });

  test("student → /", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    await login(page, "student");
  });
});

test.describe("login failures", () => {
  test("wrong password shows an error and does not log in", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    const { email } = credsFor("student");
    await page.goto("/welcome#student-login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Scope to the form's error (getByRole('alert') also matches Next's
    // route-announcer div).
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/welcome/);
    // And we must NOT have been logged in.
    await expect(page.getByRole("button", { name: /sign out/i })).toHaveCount(0);
  });
});

test.describe("role isolation (wrong-role access is blocked)", () => {
  test("student visiting /admin is not shown the admin dashboard", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    await login(page, "student");
    await page.goto("/admin");
    // Admin page redirects a non-admin away (landingFor) — must NOT show the
    // platform ops dashboard.
    await expect(page.getByText(/operations dashboard/i)).toHaveCount(0);
  });

  test("teacher visiting /admin is not shown the admin dashboard", async ({ page }) => {
    test.skip(!hasCreds("teacher"), "SEED_TEACHER_* not set");
    await login(page, "teacher");
    await page.goto("/admin");
    await expect(page.getByText(/operations dashboard/i)).toHaveCount(0);
  });
});

test.describe("logout clears the session", () => {
  test("after logout, a protected route redirects to /welcome", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    await login(page, "student");
    await page.getByRole("button", { name: /sign out|log out|logout/i }).first().click();
    await page.goto("/");
    await expect(page).toHaveURL(/\/welcome$/);
  });
});
