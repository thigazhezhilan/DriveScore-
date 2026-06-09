import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 200 });

// ── Student home ──────────────────────────────────────────────────────────────
const studentPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await studentPage.goto('http://localhost:3000/login');
await studentPage.waitForLoadState('networkidle');
await studentPage.fill('input[name="email"]', 'student@synaptest.test');
await studentPage.fill('input[name="password"]', 'Student-Demo-2026');
await studentPage.click('button[type="submit"]');
await studentPage.waitForTimeout(4000);
await studentPage.waitForLoadState('networkidle');
await studentPage.screenshot({ path: 'c:/tmp/v1_student_home.png', fullPage: true });
console.log('Student home URL:', studentPage.url());
const homeText = await studentPage.innerText('body');
console.log('Home text preview:', homeText?.substring(0, 400));

// ── Teacher mock edit ─────────────────────────────────────────────────────────
const teacherPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await teacherPage.goto('http://localhost:3000/login');
await teacherPage.waitForLoadState('networkidle');
await teacherPage.fill('input[name="email"]', 'teacher@synaptest.test');
await teacherPage.fill('input[name="password"]', 'Teacher-Demo-2026');
await teacherPage.click('button[type="submit"]');
await teacherPage.waitForTimeout(4000);
await teacherPage.waitForLoadState('networkidle');
await teacherPage.goto('http://localhost:3000/teacher/mocks');
await teacherPage.waitForLoadState('networkidle');
await teacherPage.waitForTimeout(1000);
await teacherPage.screenshot({ path: 'c:/tmp/v2_teacher_mocks.png', fullPage: true });
console.log('Teacher mocks URL:', teacherPage.url());

// Click first mock edit link
const editLink = await teacherPage.$('a[href*="/edit"]');
if (editLink) {
  await editLink.click();
  await teacherPage.waitForLoadState('networkidle');
  await teacherPage.waitForTimeout(1500);
  await teacherPage.screenshot({ path: 'c:/tmp/v3_mock_edit.png', fullPage: true });
  console.log('Mock edit URL:', teacherPage.url());
}

await browser.close();
