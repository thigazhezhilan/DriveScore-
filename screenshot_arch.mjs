import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 150 });

// ── 1. Root URL should redirect to /welcome ───────────────────────────────────
const p1 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await p1.goto('http://localhost:3000/');
await p1.waitForLoadState('networkidle');
await p1.waitForTimeout(2000);
console.log('Root / URL:', p1.url());
await p1.screenshot({ path: 'c:/tmp/arch1_root.png', fullPage: false });

// ── 2. Welcome page with student login section ────────────────────────────────
await p1.goto('http://localhost:3000/welcome#student-login');
await p1.waitForLoadState('networkidle');
await p1.waitForTimeout(2000);
await p1.screenshot({ path: 'c:/tmp/arch2_welcome_login.png', fullPage: false });

// ── 3. Teacher page (private URL) - should show teacher login ─────────────────
const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await p2.goto('http://localhost:3000/teacher');
await p2.waitForLoadState('networkidle');
await p2.waitForTimeout(2000);
console.log('Teacher URL:', p2.url());
await p2.screenshot({ path: 'c:/tmp/arch3_teacher_login.png', fullPage: false });

// ── 4. Admin page (private URL) - should show admin login ────────────────────
const p3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await p3.goto('http://localhost:3000/admin');
await p3.waitForLoadState('networkidle');
await p3.waitForTimeout(2000);
console.log('Admin URL:', p3.url());
await p3.screenshot({ path: 'c:/tmp/arch4_admin_login.png', fullPage: false });

// ── 5. Student logs in from welcome page ─────────────────────────────────────
await p1.goto('http://localhost:3000/welcome');
await p1.waitForLoadState('networkidle');
await p1.waitForTimeout(1500);
// scroll to login section
await p1.evaluate(() => document.getElementById('student-login')?.scrollIntoView());
await p1.waitForTimeout(500);
await p1.screenshot({ path: 'c:/tmp/arch5_login_section.png', fullPage: false });
await p1.fill('input[name="email"]', 'student@synaptest.test');
await p1.fill('input[name="password"]', 'Student-Demo-2026');
await p1.click('button[type="submit"]');
await p1.waitForTimeout(4000);
await p1.waitForLoadState('networkidle');
console.log('After student login URL:', p1.url());
await p1.screenshot({ path: 'c:/tmp/arch6_after_login.png', fullPage: false });

await browser.close();
