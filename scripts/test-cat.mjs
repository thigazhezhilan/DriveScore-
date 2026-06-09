/** Drive the AI Practice run as the student, answering CORRECTLY, and log the
 *  difficulty served each step — proving the CAT engine climbs toward Hard. */
import fs from "node:fs";
import { chromium } from "playwright";

const keys = JSON.parse(fs.readFileSync("/tmp/ce_keys.json", "utf8"));
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);

const b = await chromium.launch();
const pg = await b.newPage();

// login as student (form is embedded on /welcome)
await pg.goto("http://localhost:3000/welcome");
await pg.waitForLoadState("networkidle");
await pg.fill('input[name="email"]', "student@synaptest.test");
await pg.fill('input[name="password"]', env.SEED_STUDENT_PASSWORD || "Student-Demo-2026");
await pg.getByRole("button", { name: /sign in/i }).click();
await pg.waitForURL((u) => !u.toString().endsWith("/welcome"), { timeout: 10000 }).catch(() => {});
await pg.waitForLoadState("networkidle");

// straight into the AI-track run for Current Electricity
await pg.goto("http://localhost:3000/practice/climb?subject=Physics&chapter=" + encodeURIComponent("Current Electricity") + "&source=ai");
await pg.waitForLoadState("networkidle");

const seq = [];
for (let step = 0; step < 8; step++) {
  await pg.waitForSelector("h2", { timeout: 8000 }).catch(() => {});
  const qText = (await pg.locator("h2").first().textContent().catch(() => "")) || "";
  const diff = (await pg.locator(".pill").nth(1).textContent().catch(() => "?"))?.trim() || "?";
  if (!qText) break;
  const ans = keys[norm(qText)];
  if (ans === undefined) { seq.push(`${diff}(unknown Q)`); break; }
  seq.push(`${diff}`);
  // pick the correct option, check, then advance
  await pg.locator("button.rounded-2xl.border").nth(ans).click();
  await pg.getByText("Check answer").click();
  await pg.waitForSelector("text=/Next|See report/", { timeout: 8000 }).catch(() => {});
  const btn = pg.getByText(/Next|See report/);
  const label = (await btn.first().textContent().catch(() => "")) || "";
  await btn.first().click();
  if (/report/i.test(label)) { seq.push("→report"); break; }
  await pg.waitForTimeout(400);
}

console.log("Difficulty served (all answered CORRECTLY):");
console.log("  " + seq.join("  →  "));
await b.close();
