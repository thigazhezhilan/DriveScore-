import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Login
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[name="email"]', 'student@synaptest.test');
await page.fill('input[name="password"]', 'Student-Demo-2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);
await page.waitForLoadState('networkidle');
console.log('Home URL:', page.url());

// Click Start mock
const startBtn = await page.$('a[href*="test"]');
if (startBtn) {
  const href = await startBtn.getAttribute('href');
  console.log('Navigating to:', href);
  await startBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('Test page URL:', page.url());
  await page.screenshot({ path: 'c:/tmp/t1_test_start.png', fullPage: true });
  
  // Look at test UI
  const txt = await page.textContent('body');
  console.log('Test page text (visible):', txt?.replace(/\s+/g, ' ')?.substring(0, 600));
  
  // Check for question options
  const options = await page.$$('button, [role="radio"], label');
  console.log('Option/interactive elements:', options.length);
  
  // Try answering first question - click first visible button that looks like an option
  const allButtons = await page.$$('button');
  for (const btn of allButtons) {
    const txt = await btn.textContent();
    const isVisible = await btn.isVisible();
    if (isVisible) console.log(' Button:', txt?.trim().substring(0, 80));
  }
} else {
  console.log('No test link found on page');
  await page.screenshot({ path: 'c:/tmp/t1_no_test.png', fullPage: true });
}

await browser.close();
