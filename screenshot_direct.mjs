import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Login first
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[name="email"]', 'student@synaptest.test');
await page.fill('input[name="password"]', 'Student-Demo-2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);
await page.waitForLoadState('networkidle');
console.log('After login URL:', page.url());

// Now directly navigate to the test URL
await page.goto('http://localhost:3000/test?mock=5ee76e27-aee7-4601-8918-4d5095ab373f');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000);
console.log('Test page URL:', page.url());

await page.screenshot({ path: 'c:/tmp/d1_test_direct.png', fullPage: true });

// Get all text on page
const txt = await page.innerText('body');
console.log('Page visible text:', txt?.substring(0, 800));

await browser.close();
