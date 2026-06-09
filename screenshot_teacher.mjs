import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[name="email"]', 'teacher@synaptest.test');
await page.fill('input[name="password"]', 'Teacher-Demo-2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);
await page.waitForLoadState('networkidle');
console.log('Teacher URL:', page.url());

await page.goto('http://localhost:3000/teacher/mocks');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'c:/tmp/t_mocks_list.png', fullPage: true });

const editLink = await page.$('a[href*="/edit"]');
if (editLink) {
  await editLink.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'c:/tmp/t_mock_edit.png', fullPage: true });
  console.log('Edit page URL:', page.url());
  const txt = await page.innerText('body');
  console.log('Edit page text:', txt?.substring(0, 500));
} else {
  console.log('No edit link found');
}

await browser.close();
