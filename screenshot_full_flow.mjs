import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Login
await page.goto('http://localhost:3000/login');
await page.waitForLoadState('networkidle');
await page.fill('input[name="email"]', 'student@synaptest.test');
await page.fill('input[name="password"]', 'Student-Demo-2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);

// Go directly to test
await page.goto('http://localhost:3000/test?mock=5ee76e27-aee7-4601-8918-4d5095ab373f');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
console.log('Test URL:', page.url());

// Answer all 9 questions
for (let i = 1; i <= 9; i++) {
  console.log(`Answering question ${i}...`);
  await page.screenshot({ path: `c:/tmp/q${i}.png` });
  
  // Click option A (first option)
  const optionA = await page.$('button:has-text("A"), [data-option="0"], .option-btn');
  if (!optionA) {
    // Try clicking first answer option
    const opts = await page.$$('button');
    console.log('  buttons on page:', opts.length);
    for (const b of opts) {
      const t = await b.textContent();
      console.log('  ', t?.trim().substring(0,40));
    }
  }
  
  // Find and click the first answer option (label A)
  const allBtns = await page.$$('button');
  let clicked = false;
  for (const btn of allBtns) {
    const txt = await btn.textContent();
    if (txt?.trim().startsWith('A') || txt?.includes('Real, inverted') || txt?.includes('2.99') || txt?.includes('Na')) {
      await btn.click();
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    // Just click any option that's not Next/Clear
    for (const btn of allBtns) {
      const txt = await btn.textContent();
      const t = txt?.trim() ?? '';
      if (!t.includes('Next') && !t.includes('Clear') && !t.includes('Submit') && t.length > 5) {
        await btn.click();
        clicked = true;
        break;
      }
    }
  }
  
  await page.waitForTimeout(500);
  
  // Click Next or Submit
  const nextBtn = await page.$('button:has-text("Next"), button:has-text("Submit"), button:has-text("Finish")');
  if (nextBtn) {
    const btnText = await nextBtn.textContent();
    console.log(`  Clicking: ${btnText?.trim()}`);
    await nextBtn.click();
    await page.waitForTimeout(1500);
    
    // Check if modal/confirm appeared
    const modalBtns = await page.$$('button');
    for (const mb of modalBtns) {
      const t = await mb.textContent();
      if (t?.includes('Submit') || t?.includes('Confirm') || t?.includes('Yes')) {
        console.log('  Confirm modal found, clicking:', t);
        await mb.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
  }
}

// Wait for redirect to report
await page.waitForTimeout(5000);
await page.waitForLoadState('networkidle');
console.log('Final URL:', page.url());
await page.screenshot({ path: 'c:/tmp/r1_report.png', fullPage: true });

const txt = await page.innerText('body');
console.log('Report page text:', txt?.substring(0, 600));

await browser.close();
