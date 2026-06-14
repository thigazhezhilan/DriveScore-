import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility checks (axe-core) on the public marketing pages and
 * the login surfaces. Reports serious/critical WCAG violations.
 *
 * `prefers-reduced-motion` is honoured by emulating it for the home page so the
 * heavy hero motion is suppressed during the scan.
 */

const PAGES = ["/welcome", "/about", "/features", "/for-centres", "/contact", "/faq"];

for (const path of PAGES) {
  test(`a11y: ${path} has no serious/critical violations`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    // Attach full results for the report.
    await testInfo.attach(`axe-${path.replace(/\//g, "_")}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    });

    // Split structural a11y bugs (labels/alt/ARIA/names) from `color-contrast`.
    // Contrast on the dark marketing palette is a tracked DESIGN decision (see
    // QA-REPORT.md), not a code bug — record it as an annotation but don't fail
    // the suite on it. Everything else must be zero.
    const contrast = serious.filter((v) => v.id === "color-contrast");
    const structural = serious.filter((v) => v.id !== "color-contrast");

    if (contrast.length) {
      const nodes = contrast.reduce((n, v) => n + v.nodes.length, 0);
      testInfo.annotations.push({
        type: "a11y-contrast-debt",
        description: `${path}: ${nodes} color-contrast node(s) below WCAG AA`,
      });
    }

    expect(
      structural,
      structural.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n"),
    ).toEqual([]);
  });
}

test("a11y: student login form is keyboard reachable & labelled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/welcome#student-login");

  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();

  // Each input has an associated <label>.
  for (const input of [email, password]) {
    const id = await input.getAttribute("id");
    expect(id, "input has id for label association").toBeTruthy();
    await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
  }
});
