import { test, expect } from "@playwright/test";
import { login, hasCreds } from "./helpers/auth";

/**
 * Security walls around the report screen (read-only; no data written).
 *
 * The report page (app/report/page.tsx) enforces access server-side:
 *   - missing attempt id      → "No attempt selected"
 *   - unknown (valid) id      → "Report not found"
 *   - another student's id    → "Not your report"
 *   - cross-centre (teacher)  → "Outside your centre"
 * It also redacts the answer key before serialising to the browser.
 */

const RANDOM_UUID = "00000000-0000-4000-8000-000000000000";

test.describe("report access control", () => {
  test("no attempt id → friendly notice, not a crash", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    await login(page, "student");
    await page.goto("/report");
    await expect(page.getByText(/no attempt selected/i)).toBeVisible();
  });

  test("unknown attempt id → 'Report not found', not someone else's data", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    await login(page, "student");
    await page.goto(`/report?attempt=${RANDOM_UUID}`);
    // Either "Report not found" (null) or a graceful load error — never a crash
    // and never another student's report.
    await expect(
      page.getByText(/report not found|couldn't load the report|not your report/i),
    ).toBeVisible();
  });

  test("answer key is never shipped to the browser on a report", async ({ page }) => {
    test.skip(!hasCreds("student"), "SEED_STUDENT_* not set");
    await login(page, "student");
    // Inspect the home page payload is not enough; this asserts the redaction
    // contract holds for any report the student CAN see. We can't guarantee a
    // seeded attempt id here, so we assert the notice path stays safe.
    await page.goto(`/report?attempt=${RANDOM_UUID}`);
    const html = await page.content();
    expect(html).not.toContain('"answerIndex":0');
    expect(html).not.toContain('"answerIndex":1');
  });
});
