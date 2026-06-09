import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Login as student
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[name="email"]', 'student@synaptest.test');
await page.fill('input[name="password"]', 'Student-Demo-2026');
await page.click('button[type="submit"]');

// Wait for redirect to complete
await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(4000);
await page.waitForLoadState('networkidle');
console.log('URL after login:', page.url());
await page.screenshot({ path: 'c:/tmp/h1_student_home.png', fullPage: true });

const homeText = await page.textContent('body');
console.log('Page text (first 1200):\n', homeText?.replace(/\s+/g, ' ')?.substring(0, 1200));

// Test/mock links
const testLinks = await page.$$('a[href*="test"], a[href*="mock"]');
console.log('\nTest/mock links found:', testLinks.length);
for (const link of testLinks) {
  const href = await link.getAttribute('href');
  const txt = await link.textContent();
  console.log(' - ', href, '|', txt?.trim().substring(0, 60));
}

// Buttons
const buttons = await page.$$('button');
console.log('\nButtons found:', buttons.length);
for (const btn of buttons) {
  const txt = await btn.textContent();
  if (txt?.trim()) console.log(' - ', txt?.trim().substring(0, 60));
}

await browser.close();
