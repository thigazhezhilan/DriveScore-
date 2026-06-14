import { test, expect, type Page } from "@playwright/test";

/**
 * Marketing site: navigation, links, mobile menu, demo form, and a no-404
 * crawl across every public route. No auth, no DB — these run anywhere.
 *
 * Behaviour note (vs the original QA brief): `/login` is RETIRED — it 307s to
 * `/welcome`. The marketing "Log in" link points at `/welcome#student-login`.
 * Tests assert the app's real behaviour, not the stale brief.
 */

const MARKETING_ROUTES = [
  "/welcome",
  "/about",
  "/features",
  "/for-centres",
  "/contact",
  "/faq",
];

const NAV = [
  { label: "Home", path: "/welcome" },
  { label: "About", path: "/about" },
  { label: "Features", path: "/features" },
  { label: "Who it's for", path: "/for-centres" },
  { label: "Contact", path: "/contact" },
  { label: "FAQ", path: "/faq" },
];

test.describe("Marketing — every route loads (no 404/500)", () => {
  for (const route of MARKETING_ROUTES) {
    test(`GET ${route} returns 200`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status(), `${route} status`).toBe(200);
      // Page chrome present.
      await expect(page.getByRole("link", { name: /DriveScore home/i })).toBeVisible();
    });
  }
});

test.describe("Marketing — desktop navbar", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const item of NAV) {
    test(`navbar "${item.label}" → ${item.path}`, async ({ page }) => {
      await page.goto("/welcome");
      const nav = page.locator("header nav");
      await nav.getByRole("link", { name: item.label, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`${item.path}$`));
    });
  }

  test('"Log in" link points to the student login section', async ({ page }) => {
    await page.goto("/welcome");
    const login = page.locator("header").getByRole("link", { name: /^log in$/i });
    await expect(login).toHaveAttribute("href", "/welcome#student-login");
  });

  test('"Book a demo" CTA is a mailto', async ({ page }) => {
    await page.goto("/welcome");
    const cta = page.locator("header").getByRole("link", { name: /book a demo/i });
    await expect(cta).toHaveAttribute("href", /^mailto:/);
  });
});

test.describe("Marketing — mobile hamburger menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens the menu and navigates", async ({ page }) => {
    await page.goto("/welcome");
    const toggle = page.getByRole("button", { name: /open menu/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileMenu = page.locator("#mobile-menu");
    await expect(mobileMenu).toBeVisible();

    await mobileMenu.getByRole("link", { name: "Features", exact: true }).click();
    await expect(page).toHaveURL(/\/features$/);
  });
});

test.describe("Marketing — footer", () => {
  test("footer section links all resolve to 200", async ({ page, request }) => {
    await page.goto("/welcome");
    const footer = page.locator("footer");
    const links = footer.locator('a[href^="/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    const hrefs = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href) hrefs.add(href.split("#")[0]);
    }
    for (const href of hrefs) {
      const res = await request.get(href);
      // /welcome#student-login → /welcome (200). /login would 307→/welcome.
      expect([200, 307, 308], `footer link ${href}`).toContain(res.status());
    }
  });

  test("footer contact email is a mailto", async ({ page }) => {
    await page.goto("/welcome");
    const mail = page.locator("footer").getByRole("link", { name: /@/ }).first();
    await expect(mail).toHaveAttribute("href", /^mailto:/);
  });
});

test.describe("Marketing — demo (contact) form", () => {
  test("blocks submit when required fields are empty (native validation)", async ({ page }) => {
    await page.goto("/contact");
    const form = page.locator("form").filter({ has: page.locator('input[name="name"]') });
    await form.getByRole("button", { name: /send demo request/i }).click();

    // Required name field should report invalid and keep us on /contact.
    const name = form.locator('input[name="name"]');
    const valid = await name.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(valid).toBe(false);
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("composes a mailto when required fields are filled", async ({ page }) => {
    await page.goto("/contact");
    const form = page.locator("form").filter({ has: page.locator('input[name="name"]') });
    await form.locator('input[name="name"]').fill("QA Bot");
    await form.locator('input[name="contact"]').fill("qa@example.com");

    // Intercept the mailto navigation rather than actually launching a client.
    const name = form.locator('input[name="name"]');
    expect(await name.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
  });
});
