import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// Login as student
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[name="email"]', 'student@synaptest.test');
await page.fill('input[name="password"]', 'Student-Demo-2026');
await page.screenshot({ path: 'c:/tmp/s1_filled.png' });

await page.click('button[type="submit"]');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'c:/tmp/s2_after_login.png', fullPage: true });
console.log('After login URL:', page.url());

// Get page text to see errors or content
const bodyText = await page.textContent('body');
console.log('Page body (first 800 chars):\n', bodyText?.substring(0, 800));

// If we're on student home, look around
if (page.url().includes('localhost:3000') && !page.url().includes('login')) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'c:/tmp/s3_home.png', fullPage: true });
  console.log('Student home loaded!');
  
  // Try clicking a mock if any visible
  const mockLinks = await page.$$('a[href*="test"], a[href*="mock"], button');
  console.log('Clickable elements count:', mockLinks.length);
}

await browser.close();
