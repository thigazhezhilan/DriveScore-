# DriveScore — QA & Validation Report

> Full-app validation pass: build/type/test health, an automated Playwright e2e
> suite (marketing, auth, redirects, security walls, a11y, perf/fallback),
> static security audits, and a prioritised list of issues fixed vs. left for
> your review.
>
> Date: 2026-06-14 · Branch: `main` (deployed at `https://drive-score.vercel.app`)
> Scope guardrail honoured: **no changes** to the diagnosis engine, grading,
> ratings, auth logic, RLS policies, or DB schema — those are validated and
> reported only.

---

## 0. Important: the brief vs. the real app

The QA brief was written against an earlier "SynapTest" snapshot. Several of its
assumptions are now **stale**, so tests assert the app's *real* behaviour:

| Brief assumed | Reality in code | Where |
|---|---|---|
| Product is "SynapTest" | Rebranded **DriveScore** (seed emails kept `@synaptest.test`) | everywhere |
| "Log in" → `/login` | `/login` is **retired** → 307 redirects to `/welcome` | `app/login/page.tsx` |
| Logged-out everything → `/login` | Student routes → `/welcome`; `/admin` & `/teacher` show their **own** login form (no redirect); their sub-routes → `/admin` / `/teacher` | `lib/supabase/middleware.ts` |
| "13 diagnosis tests" | **41** unit checks (13 diagnosis + 28 rating) | `npm test` |
| One login page | 3 login surfaces: student on `/welcome#student-login`, teacher on `/teacher`, admin on `/admin` | — |

---

## 1. Build & code health ✅

| Check | Result |
|---|---|
| `npm run build` | ✅ Clean — compiles, 32 static pages generated, **no type errors, no warnings** |
| `npx tsc --noEmit` (app) | ✅ Clean (exit 0) |
| `npm test` (unit) | ✅ **41/41** checks pass (diagnosis 13 + rating 28) |
| `npx playwright test` (e2e) | ✅ **56 passed, 1 skipped** (skipped = gated mutating flow) |
| Secret leak in client bundle | ✅ No `service_role` string and no secret-key literal in `.next/static` |
| Console errors on public routes | ✅ Zero (after isolating a false positive — see §6) |

### Route sizes (production build, First Load JS)

| Route | Size | First Load |
|---|---|---|
| `/` (student home) | 6.0 kB | **207 kB** ⬅ heaviest |
| `/admin` | 4.1 kB | 165 kB |
| `/teacher` | 3.7 kB | 165 kB |
| `/report` | 11.6 kB | 145 kB |
| `/welcome` | 8.9 kB | 142 kB |
| `/progress`, `/teacher/students/[id]` | ~0.15 kB | 136 kB |
| `/test` | 5.7 kB | 137 kB |
| Marketing (`/about`,`/features`,`/for-centres`) | ~0.4 kB | 127–132 kB |
| Shared chunks | — | 87.2 kB |
| Middleware | — | 83 kB |

three.js / `@react-three` is **not** in any initial payload — it's a lazy,
`ssr:false` chunk loaded only on capable devices (verified by test).

---

## 2. Automated e2e suite (new) ✅

Playwright is installed and configured (`playwright.config.ts`). Run with:

```bash
npm run test:e2e          # all non-mutating suites (headless)
npm run test:e2e:ui       # interactive UI mode
```

The config boots the **production build** (`npm run start`) on a clean port and
runs under emulated `prefers-reduced-motion` (the real low-power fallback path).

| Spec | Coverage | Result |
|---|---|---|
| `marketing.spec.ts` | All 6 nav links, mobile hamburger menu, footer links (resolve 200), "Book a demo" mailto, demo-form required-field validation + mailto compose, no-404 crawl | ✅ |
| `auth-redirects.spec.ts` | Logged-out gating for `/`, `/test`, `/report`, `/progress`, `/practice*` → `/welcome`; `/login`→`/welcome`; `/admin` & `/teacher` show login form; sub-routes redirect | ✅ |
| `auth-login.spec.ts` | Each role logs in & lands correctly (admin→/admin, teacher→/teacher, student→/); wrong password shows error & stays logged out; **role isolation** (student/teacher can't see admin dashboard); logout clears session | ✅ |
| `security.spec.ts` | Report access walls: no-id notice, unknown-id → "Report not found" (no crash, no other student's data), answer key never serialised to browser | ✅ |
| `perf-fallback.spec.ts` | three.js absent from initial HTML; reduced-motion → no WebGL canvas (aurora fallback); first response < 8 s | ✅ |
| `console-errors.spec.ts` | No `console.error` / unhandled rejection across all 6 marketing routes | ✅ |
| `a11y.spec.ts` | axe-core WCAG 2 A/AA scan on 6 marketing pages + login-form labelling/keyboard | ✅ structural / ⚠️ contrast (see §4) |
| `mutating/teacher-add-question.spec.ts` | Template for write flows — **gated** (see §5) | ⏭ skipped |

**Auth was exercised against the live Supabase** with the seeded demo accounts —
login, role routing, role isolation, and logout all pass, confirming the
Vercel ↔ Supabase wiring end-to-end.

---

## 3. Issues FIXED (low-risk) ✅

1. **Dead "Log in" links (3 places)** — `/login` is retired and 307s to
   `/welcome`, so the marketing "Log in" links were a confusing bounce. Pointed
   them at the actual student login section:
   - `components/marketing/MarketingNav.tsx` (desktop + mobile)
   - `components/marketing/MarketingFooter.tsx`
   - → all now `/welcome#student-login`
2. **Stale doc comments** corrected in `MarketingNav.tsx` (said "→ /login").
3. **Tooling**: added Playwright config, an e2e suite, `@axe-core/playwright`,
   `test:e2e` scripts, `.gitignore` entries for test artefacts, and an
   `e2e/tsconfig.json`. No app behaviour touched.

> Note: stale doc comments also remain in `LogoutButton.tsx` and
> `app/login/actions.ts` (they say "/login" but the code uses "/welcome"). Left
> as-is to avoid churn; harmless — listed for awareness.

---

## 4. Accessibility ♿

**Structural a11y: clean.** axe-core found **zero** serious/critical violations
for labels, alt text, ARIA, names, or keyboard/focus on any marketing page. The
login form inputs are properly `<label for>`-associated and keyboard reachable.

**⚠️ One tracked issue — colour contrast (WCAG AA):** every marketing page has
**5 nodes** below the AA contrast ratio. These are the shared dark-theme chrome
elements using very low text opacity (e.g. `text-paper/40`, `text-paper/35`,
`text-paper/60` on the `#06140f` background) — footer fine-print, the
"Scroll to discover" cue, and muted nav/section labels.

- This is a **design decision**, not a code bug, so it is **not auto-fixed** — it
  needs your eye on the palette. The a11y test records it as an annotation
  (`a11y-contrast-debt`) rather than failing the suite.
- **Suggested fix** (your call): bump the lowest opacities ~`/40 → /60`,
  `/35 → /55`. Small visual change, clears AA.

---

## 5. Mutating flows — written but GATED ⏭

The brief asks for teacher/admin/student write flows (add question, CSV import,
build+publish mock, add student, create centre+teacher, take a full mock→report).
These **write to the database**. Running them against the **live demo Supabase**
would inflate the admin KPIs you're showing centres (13 centres / 287 students /
4,612 mocks) and leave orphaned rows.

**Decision:** they are gated behind `RUN_MUTATING=1` and a throwaway DB
(`e2e/mutating/README.md`). A fully-wired **template** (`teacher-add-question`)
is provided as the pattern. To run against a disposable Supabase project:

```powershell
$env:RUN_MUTATING = "1"; npx playwright test e2e/mutating
```

The remaining write flows should be ported there against a test DB (see manual
checklist §8).

---

## 6. ⚠️ Issues found — for YOUR review (not auto-changed)

### 🔴 P1 — Next.js 14.2.5 has a CRITICAL security advisory set
`npm audit` flags **critical** Next.js CVEs, including **Authorization Bypass in
Middleware (GHSA-f82v-jwr5-mffw)** — directly relevant because this app gates
auth in `middleware.ts`. Also cache-poisoning, SSRF, and DoS advisories.
- **Fix:** `npm i next@14.2.35` (a safe patch within 14.2.x), then rebuild &
  redeploy. I did **not** bump the framework mid-QA — it warrants a deliberate
  build + smoke test + redeploy by you.
- Lower severity, dev-only: `tsx`/`esbuild` (high) and `postcss` (moderate) —
  build tooling, not shipped to users.

### 🟠 P2 — Admin dashboard is slow to first render (~12.8 s cold)
Measured: admin login → ops-dashboard render took **~12.8 s** on a cold load
(local → Supabase free tier). It runs 4 heavy cross-centre aggregates
(`getCentreHealth`, `getPlatformKpis`, `getTrends`, `getDiagnosisBreakdown` in
`lib/db/adminAnalytics.ts`). This is engine/DB-adjacent, so **reported, not
changed**.
- **Options (your call):** parallelise the 4 queries with `Promise.all` (same
  pattern as commit `77b4118` did for `/progress`); add DB indexes for the
  aggregates; or cache the dashboard for N minutes. Will get much worse as
  centres grow.

### 🟡 P3 — `/` (student home) is the heaviest bundle (207 kB First Load)
Worth a glance to confirm nothing heavy (e.g. a charting/3D import) leaks into
the student home that could be lazy-loaded. Not blocking.

### 🟡 P3 — Auth-component "back to login" links also point at `/login`
`components/auth/SignupForm.tsx` and `ForgotPasswordForm.tsx` link to `/login`
(→ bounces to `/welcome`). Works, but lands on the marketing home rather than a
login form. Not fixed because the "right" target is **role-dependent** (a
teacher who used Forgot Password should return to `/teacher`, not the student
form) — your decision on desired UX.

---

## 7. Performance summary 📊

| Metric | Value |
|---|---|
| Marketing pages DOMContentLoaded (prod, local) | **30–159 ms** ✅ |
| three.js in initial payload | **No** — lazy `ssr:false` chunk ✅ |
| Reduced-motion / low-power fallback | **Triggers correctly** — CSS aurora, no WebGL canvas ✅ |
| Heaviest route First Load JS | `/` at 207 kB |
| Admin dashboard cold render | **~12.8 s** ⚠️ (see §6 P2) |

The hero's progressive enhancement is well built: lightweight aurora paints
first (and is the permanent fallback); WebGL `HeroScene3D` upgrades only on
capable, non-reduced-motion, non-phone, non-low-power devices, behind an error
boundary (`components/landing/CinematicBackground.tsx`,
`useDeviceCapability.ts`).

---

## 8. 📱 Manual checks YOU must still do

Automated tests can't cover these — please verify by hand:

1. **Real device test** — open `https://drive-score.vercel.app` on an actual
   phone: hero falls back to aurora, mobile menu, student login + take a mock.
2. **PWA install** — "Add to Home Screen" on Android/iOS; confirm icon + offline
   shell behave (service worker is registered).
3. **Full student loop on a TEST DB** — take a real mock (timer, leave one
   blank, submit) → report renders → all 3 tabs (Student/Teacher/Parent) → refresh
   the report URL persists. (Don't do this on the demo DB.)
4. **Write flows on a TEST DB** — add question, CSV import with deliberately bad
   rows (per-row errors), build + publish a mock, add a student (temp password),
   create a centre + teacher. Port these into `e2e/mutating/`.
5. **Cross-student / cross-centre report wall** — log in as student A, grab a
   real attempt id, try it as student B → "Not your report"; try as a teacher
   from another centre → "Outside your centre". (Code path verified server-side
   in `app/report/page.tsx`; the live cross-account check needs two seeded
   accounts.)
6. **Lighthouse** — run Chrome DevTools → Lighthouse on `/welcome` and a
   logged-in page (mobile profile) for real Core Web Vitals. axe covers a11y
   rules; Lighthouse adds perf/SEO/best-practices scoring.
7. **Email deliverability** — signup confirmation + password reset actually
   arrive (Supabase free mailer is ~2–4/hr; set custom SMTP before real users).
8. **Supabase 7-day idle pause** — confirm the project hasn't paused before a
   demo; free tier sleeps when idle.
9. **Apply the Next.js patch** (§6 P1) and re-run `npm run build` + e2e before
   the next deploy.

---

## 9. How to re-run everything

```bash
npm run build         # production build (clean)
npm test              # 41 unit checks
npm run test:e2e      # 56 e2e (boots prod server automatically)
npm audit             # dependency advisories (see §6 P1)
```

> Windows note (from HANDOFF.md, confirmed during this pass): do **not** run
> `npm run build` while `npm run dev` is up — they share `.next` and the dev
> server's cache corrupts (→ 500s on static chunks). Stop dev, optionally
> `Remove-Item -Recurse -Force .next`, then build. The e2e config now owns its
> own server (`reuseExistingServer: false`) to avoid latching onto a stray dev
> server.
