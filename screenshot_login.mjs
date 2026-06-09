import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Go to login page
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'c:/tmp/login_page.png', fullPage: true });
console.log('LOGIN PAGE screenshot taken, URL:', page.url());

// Try logging in as student
const emailInput = await page.$('input[type="email"], input[name="email"]');
const passInput = await page.$('input[type="password"]');
console.log('Email input found:', !!emailInput);
console.log('Password input found:', !!passInput);

if (emailInput) await emailInput.fill('student@synaptest.test');
if (passInput) await passInput.fill('change-me-student');

await page.screenshot({ path: 'c:/tmp/login_filled.png', fullPage: true });

const submitBtn = await page.$('button[type="submit"]');
console.log('Submit button found:', !!submitBtn);
if (submitBtn) await submitBtn.click();

await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000);
await page.screenshot({ path: 'c:/tmp/after_login.png', fullPage: true });
console.log('After login URL:', page.url());

// Check for error messages
const errorText = await page.textContent('body');
if (errorText.includes('error') || errorText.includes('Error') || errorText.includes('invalid')) {
  console.log('POSSIBLE ERROR DETECTED on page');
}

await browser.close();
