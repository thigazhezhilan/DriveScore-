import { expect, type Page } from "@playwright/test";

/**
 * Role-aware login helpers that drive the REAL login surfaces:
 *   - student → embedded form on /welcome (#student-login)
 *   - teacher → form on /teacher
 *   - admin   → form on /admin
 *
 * Credentials come from `.env.local` (SEED_* vars), loaded by playwright.config.
 * Each helper asserts the post-login landing route so a silent auth failure
 * fails the test loudly.
 */

export type Role = "student" | "teacher" | "admin";

type Creds = { email: string; password: string };

export function credsFor(role: Role): Creds {
  const map: Record<Role, Creds> = {
    admin: {
      email: process.env.SEED_ADMIN_EMAIL ?? "",
      password: process.env.SEED_ADMIN_PASSWORD ?? "",
    },
    teacher: {
      email: process.env.SEED_TEACHER_EMAIL ?? "",
      password: process.env.SEED_TEACHER_PASSWORD ?? "",
    },
    student: {
      email: process.env.SEED_STUDENT_EMAIL ?? "",
      password: process.env.SEED_STUDENT_PASSWORD ?? "",
    },
  };
  return map[role];
}

export function hasCreds(role: Role): boolean {
  const c = credsFor(role);
  return Boolean(c.email && c.password);
}

/** The page each role lands on after a successful login. */
const LANDING: Record<Role, RegExp> = {
  admin: /\/admin$/,
  teacher: /\/teacher$/,
  student: /\/$/,
};

/** The URL hosting each role's login form. */
const LOGIN_URL: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/welcome#student-login",
};

export async function login(page: Page, role: Role): Promise<void> {
  const { email, password } = credsFor(role);
  // networkidle so the client form (useFormState) is hydrated before we click —
  // otherwise a too-fast click on the heavy /welcome form is dropped pre-hydration.
  await page.goto(LOGIN_URL[role], { waitUntil: "networkidle" });

  const email$ = page.locator('input[name="email"]');
  const password$ = page.locator('input[name="password"]');
  const signOut$ = page.getByRole("button", { name: /sign out/i });

  // Submit with a small retry to absorb hydration races under parallel load.
  // The "Sign out" control only exists once authenticated; for admin/teacher the
  // login URL == the landing URL, so this (not the URL) is the success signal.
  // The admin dashboard server-renders heavy analytics, so allow a wide window.
  for (let attempt = 0; attempt < 3; attempt++) {
    await email$.fill(email);
    await password$.fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    try {
      await expect(signOut$).toBeVisible({ timeout: attempt < 2 ? 15_000 : 30_000 });
      await expect(page).toHaveURL(LANDING[role]);
      return;
    } catch {
      if (attempt === 2) throw new Error(`login(${role}) failed after retries`);
      // Re-arm: navigate back to the form if the click did nothing.
      if (!(await email$.count())) await page.goto(LOGIN_URL[role], { waitUntil: "networkidle" });
    }
  }
}
