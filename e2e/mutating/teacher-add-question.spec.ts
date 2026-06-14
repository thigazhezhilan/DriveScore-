import { test, expect } from "@playwright/test";
import { login, hasCreds } from "../helpers/auth";

/**
 * MUTATING — writes a question to the DB. Gated behind RUN_MUTATING=1 and a
 * throwaway test database. See e2e/mutating/README.md.
 *
 * Template for the remaining centre-management flows: log in as teacher, fill
 * the QuestionForm (fields mirror components/admin/QuestionForm.tsx), submit,
 * and assert the success state.
 */

const RUN = process.env.RUN_MUTATING === "1";

test.describe("teacher adds a question", () => {
  test.skip(!RUN, "Set RUN_MUTATING=1 (against a test DB) to run mutating flows");
  test.skip(!hasCreds("teacher"), "SEED_TEACHER_* not set");

  test("fills the form and sees it added to the bank", async ({ page }) => {
    await login(page, "teacher");
    await page.goto("/teacher/questions");

    // Open the add-question form (button or link, depending on layout).
    const addTrigger = page.getByRole("link", { name: /add question|new question/i })
      .or(page.getByRole("button", { name: /add question|new question/i }));
    if (await addTrigger.count()) await addTrigger.first().click();

    const stamp = `QA auto ${Date.now()}`;

    await page.locator('select[name="subject"]').selectOption("Physics");
    await page.locator('select[name="difficulty"]').selectOption({ index: 1 });
    await page.locator('input[name="chapter"]').fill("Ray Optics");
    await page.locator('input[name="concept"]').fill("Concave mirror images");
    await page.locator('input[name="par_time_sec"]').fill("60");
    await page.locator('textarea[name="question_text"]').fill(stamp);
    await page.locator('input[name="option_a"]').fill("Option A");
    await page.locator('input[name="option_b"]').fill("Option B");
    await page.locator('input[name="option_c"]').fill("Option C");
    await page.locator('input[name="option_d"]').fill("Option D");
    await page.locator('select[name="correct_option"]').selectOption("A");

    await page.getByRole("button", { name: /add question/i }).click();

    await expect(page.getByText(/question added to your bank/i)).toBeVisible();
  });
});
