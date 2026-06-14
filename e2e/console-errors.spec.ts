import { test, expect } from "@playwright/test";

/**
 * Console-health sweep: visit every public route and assert there are no
 * `console.error` messages or unhandled promise rejections during load.
 *
 * Known-benign noise (favicon 404s, third-party telemetry) is filtered so the
 * signal stays meaningful.
 */

const ROUTES = ["/welcome", "/about", "/features", "/for-centres", "/contact", "/faq"];

const IGNORE = [
  /favicon/i,
  /manifest/i,
  /service worker/i,
  /downloadable font/i,
  /\[Fast Refresh\]/i,
];

for (const route of ROUTES) {
  test(`no console errors on ${route}`, async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE.some((re) => re.test(text))) errors.push(text);
      }
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto(route);
    await page.waitForLoadState("networkidle");

    expect(errors, errors.join("\n")).toEqual([]);
  });
}
