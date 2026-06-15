---
name: drivescore-state
description: "DriveScore project — what it is, current state, and where the full handoff lives"
metadata: 
  node_type: memory
  type: project
  originSessionId: b506f817-6e0b-4de4-b9a5-917c7d92be07
---

**DriveScore** (renamed from "SynapTest" on 2026-06-14) — AI mock-test + diagnosis platform for competitive-exam coaching centres (NEET now; JEE/CAT planned, keep copy exam-neutral). Next.js 14 App Router + Supabase (Postgres/Auth/RLS) + Tailwind. Repo: `c:\Users\91995\Desktop\thigal\project2`.

Current focus: pre-deployment. Membership is **centre-based self-signup** (students/teachers sign up at `/signup`, pick a centre; teachers need a join code; email confirmation ON in Supabase). Migration `0013_centre_signup.sql` is applied. Brand logo = teal "DS" tile + chevron via `components/brand/Logo.tsx` (Montserrat brand font). 6 demo centres (~171 students) seeded via `scripts/seed-demo-centres.ts`.

**Full session handoff (read this first in a new chat): `HANDOFF.md` at repo root** — has all demo logins, join codes, commands, uncommitted-work list, and the deploy roadmap (Vercel free + Supabase free for pilot).

Deploy plan: Vercel + Supabase free tier for pilot, upgrade after ~2 centres/100 students. Watch the Supabase free 7-day inactivity pause. Set up custom SMTP before real signups (free mailer ~2-4/hr).
