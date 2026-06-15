# DriveScore — Session Handoff

> Working notes so a new chat can continue without re-deriving context.
> Last updated: 2026-06-14. Product: **DriveScore** (was "SynapTest") — an AI
> mock-test + diagnosis platform for competitive-exam coaching centres
> (NEET now; JEE/CAT planned, so keep copy exam-neutral).
> Stack: Next.js 14 App Router + TypeScript + Supabase (Postgres/Auth/RLS) +
> Tailwind. Hand-rolled SVG charts (no chart lib).

---

## ✅ Done this session (NOT yet committed — see bottom)

### 0. Diagnosis Engine v2 + Mastery Road v1 (added 2026-06-16)
- **Diagnosis Engine v2 ("No-Data Tier")** — `lib/diagnose.ts` gained
  `diagnoseDetailed()` (original `diagnose()` untouched, still used for
  grading). Adds per-diagnosis **confidence score + reason**
  (`components/report/ConfidencePill.tsx`), a new **SELF_DOUBT** category
  (needs nullable `answers.first_answer_index`, migration
  `supabase/migrations/0015_first_answer.sql`, captured client-side in
  `components/test/TestRunner.tsx`), **Speed Archetypes**
  (SNIPER/GAMBLER/BALANCED/PANICKER, `components/report/ArchetypeBadge.tsx`),
  and **Root Cause Ranking** ("Where your marks went",
  `components/report/RootCauses.tsx`). Surfaced in Student/Teacher/Parent
  report views. Tests: `lib/diagnose.v2.test.ts`, `lib/grade.test.ts`.
- **Mastery Road v1** — new student screen at **`/road`** (linked from home
  via a "Mastery Road" card in `components/home/HomeClient.tsx`). Game-like
  per-chapter progress map with 4 gates (FOUNDATION → APPLICATION →
  NEET_LEVEL → HARD), "earned twice" clearing (≥4 strong answers, ≥2
  sessions, ≥70% accuracy — stricter for HARD), decay regression to
  NEEDS_REINFORCEMENT, and a single cross-chapter "frontier" quest with a
  generated practice mock. Pure engine + config constants in `lib/mastery.ts`
  (`STRONG_ANSWERS_TO_CLEAR=4`, `MIN_SESSIONS_TO_CLEAR=2`, `CLEAR_ACCURACY=0.7`,
  `REGRESSION_ACCURACY=0.55`, `PRESCRIPTION_SIZE=8`). Data layer
  `lib/db/mastery.ts` (computed fresh from existing attempts/answers — **no
  migration needed for this part**). Server action `app/road/actions.ts`, UI
  `components/road/RoadClient.tsx`, page `app/road/page.tsx`. Tests:
  `lib/mastery.test.ts` (12 cases). Deliberately has **no global "% to NEET"**
  meter anywhere.
- Status: all 74 unit tests pass, `tsc --noEmit` clean, `next build` clean.
  Migration `0015_first_answer.sql` is **NOT yet applied** to the live DB.

### 1. Rebrand SynapTest → DriveScore (everywhere)
- Global rename across all UI, metadata, manifest, package.json, docs.
- Left untouched on purpose: `synaptest.test` **seed login emails** (real demo
  accounts — renaming breaks them) and historical **SQL migrations**.

### 2. New logo (DS monogram, "Concept 19")
- Mark = teal rounded tile + ink "DS" + rising chevron above. Self-contained
  (works on light & dark).
- Reusable component: **`components/brand/Logo.tsx`** — `<Logo />` (mark +
  "DriveScore" wordmark) or `<Logo wordmark={false} />` (mark only).
- Brand font = **Montserrat**, loaded in `app/layout.tsx` as `--font-brand`
  (only the logo uses it; rest of UI keeps Space Grotesk / Bricolage).
- Wired into: all login pages (student `/welcome`, `/teacher`, `/admin`),
  `/signup`, welcome nav + footer, student home header, teacher & admin
  authenticated dashboard headers.
- Icons: **`public/icons/favicon.svg`** (browser tab) + regenerated PWA PNGs
  (192 / 512 / maskable-512 / apple-180) via **`scripts/gen-icons.mjs`**
  (re-run with `node scripts/gen-icons.mjs` if the mark changes).
  - Caveat: PNG icons render "DS" in Arial (no Montserrat on the rasterizer);
    near-identical at icon size. Bundle Montserrat TTF if pixel-match needed.

### 3. Centre-based self-signup (built earlier; migration APPLIED)
- Students & teachers self-signup at `/signup`, pick their centre. Teachers
  also enter a per-centre **join code** (gates teacher signup).
- Membership is now by **centre** (`students.centre_id`); batches retired from
  visibility (table kept, `batch_id` nullable).
- Migration **`supabase/migrations/0013_centre_signup.sql`** — ALREADY APPLIED
  to the live DB by the user.
- Signup errors now friendly: "That email is already registered as a
  student/teacher…" (`app/signup/actions.ts`).
- Admin centre list + detail show the **join code** (`app/admin/page.tsx` badge).

### 4. Supabase config done (by user, in dashboard)
- **Auth → Sign In/Providers → Email → "Confirm email" = ON** (required:
  email verification before login / password reset).
- Migration 0013 applied.

### 5. Demo data — 6 centres seeded
- Script: **`scripts/seed-demo-centres.ts`** (`npx tsx scripts/seed-demo-centres.ts`).
  Idempotent (clears prior demo centres by name). Batched bulk inserts → ~1 min.
- Created: 6 centres, ~171 students, ~2,800 graded tests, run through the REAL
  grade + rating engine. Archetype spread per class: active / steady /
  struggling / lazy / inactive / newbie(no practice).
- **Visualize:** log in as a centre's teacher → see leaderboard, weak chapters,
  active-this-week, roster. Click any student → full individual dashboard
  (the teacher drill-down `/teacher/students/[id]` renders the same progress UI).

---

## 🔑 Demo logins

**Platform admin:** `admin@synaptest.test` / `Admin-Demo-2026`  (URL `/admin`)
**Original demo teacher:** `teacher@synaptest.test` / `Teacher-Demo-2026`
**Original demo student:** `student@synaptest.test` / `Student-Demo-2026`

**Seeded centre teachers** (all password `Teacher-Demo-2026`, URL `/teacher`):

| Centre | Email | Join code |
|---|---|---|
| Velocity Academy — Coimbatore | `teacher.velocity-academy-coimbat@drivescore.demo` | 6LU6BH |
| Apex Career Institute — Madurai | `teacher.apex-career-institute-ma@drivescore.demo` | XZ3VNJ |
| Pinnacle Learning — Velachery | `teacher.pinnacle-learning-velach@drivescore.demo` | 25NK9M |
| Sigma Classes — Trichy | `teacher.sigma-classes-trichy@drivescore.demo` | NUTZTR |
| Catalyst Academy — Salem | `teacher.catalyst-academy-salem@drivescore.demo` | 88ZGX2 |
| Brilliant Tutorials — T. Nagar | `teacher.brilliant-tutorials-t-na@drivescore.demo` | GR4L9Z |

> Join codes are random per seed run — re-seeding changes them. The admin
> dashboard always shows the current codes.

---

## 🧰 Commands
```
npm run dev                              # dev server (localhost:3000)
npm run build                            # ⚠ clobbers dev .next cache → restart dev after
npx tsc --noEmit                         # typecheck
npm test                                 # unit tests (rating engine, 28 cases)
npx tsx scripts/seed-demo-centres.ts     # seed the 6 demo centres
node scripts/gen-icons.mjs               # regenerate favicon/PWA icons
```
> Windows note: running `npm run build` while `npm run dev` is up corrupts the
> shared `.next` cache (500s). Fix: stop dev, `Remove-Item -Recurse -Force .next`,
> restart `npm run dev`.

---

## ⏭️ Next up (in priority order)

1. **COMMIT this session's work** (everything below is uncommitted). Suggested
   message: "Rebrand to DriveScore + DS logo; signup polish; demo-centre seeder".
2. **Deploy** — plan agreed: **Vercel (free)** + **Supabase (free)** for pilot,
   upgrade after ~2 centres / 100 students. Roadmap:
   - Push repo to GitHub → import to Vercel → set env vars
     (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`).
   - Supabase → Auth → URL Configuration: add the `*.vercel.app` URL to
     Redirect URLs + Site URL (else confirm/reset emails point to localhost).
   - **Custom SMTP** (Resend free 100/day, etc.) — free Supabase mailer caps
     ~2–4 emails/hr → will break signup at scale. Set this up before real users.
3. **Custom domain** — optional, add anytime in Vercel (zero downtime). ~₹800–1500/yr.
4. Rotate/secure the demo `*.test` account passwords before going public.

### Known free-tier caveat
Supabase free projects **pause after 7 days idle** (must un-pause manually).
Not storage — current data ≈ 60–90 MB of the 500 MB limit. Pro ($25/mo)
removes the pause; upgrade when there are real daily users.

---

## 📌 Uncommitted changes (as of handoff)
- New: `components/brand/Logo.tsx`, `public/icons/favicon.svg`,
  `public/icons/apple-icon-180.png`, `scripts/gen-icons.mjs`,
  `scripts/seed-demo-centres.ts`, this `HANDOFF.md`.
- Modified: rebrand + logo wiring across `app/**`, `components/**`, `lib/**`,
  `public/manifest.json`, `public/sw.js`, `public/icons/icon-*.png`,
  `app/layout.tsx`, `package.json`, `tailwind.config.ts`, docs, `scripts/seed.ts`,
  `app/signup/actions.ts` (friendly errors), `app/admin/page.tsx` (join-code badge).
- Already committed earlier: `034a678` centre-based self-signup + migration 0013.

### Diagnosis Engine v2 + Mastery Road (2026-06-16, also uncommitted)
- New: `supabase/migrations/0015_first_answer.sql`, `lib/grade.test.ts`,
  `lib/diagnose.v2.test.ts`, `components/report/ConfidencePill.tsx`,
  `components/report/RootCauses.tsx`, `components/report/ArchetypeBadge.tsx`,
  `lib/mastery.ts`, `lib/mastery.test.ts`, `lib/db/mastery.ts`,
  `app/road/page.tsx`, `app/road/actions.ts`, `components/road/RoadClient.tsx`.
- Modified: `lib/types.ts`, `lib/diagnose.ts`, `lib/grade.ts`,
  `lib/db/queries.ts`, `lib/db/practice.ts`, `components/test/TestRunner.tsx`,
  `components/categoryStyles.ts`, `components/report/DiagnosisGroups.tsx`,
  `components/report/StudentView.tsx`, `components/report/TeacherView.tsx`,
  `components/report/ParentView.tsx`, `components/home/HomeClient.tsx`,
  `app/admin/page.tsx`, `package.json` (test script).
- Migration `0015_first_answer.sql` not yet applied to live DB.
