/**
 * DriveScore — Home (`/welcome`, the marketing site's front page).
 *
 * A login-free sales page for coaching-centre owners (the buyers) and parents
 * (who must trust it). Public via the middleware allowlist; touches nothing in
 * the app — no DB, no auth gate, no engine. The shared navbar + footer come
 * from the (marketing) layout; this page owns the cinematic hero, the section
 * narrative, and the embedded student login.
 *
 * Server component with small client islands for motion (<Reveal>, <Neuro>,
 * <Parallax>) and the CSS <CinematicBackground>. All motion is reduced-motion
 * safe. Copy honesty: no fabricated testimonials/stats — one marked placeholder.
 */

import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  Dices,
  Gauge,
  GraduationCap,
  Hourglass,
  Mail,
  School,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  CheckCircle2,
  EyeOff,
  Lock,
} from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { CinematicBackground } from "@/components/landing/CinematicBackground";
import { Reveal } from "@/components/landing/Reveal";
import { Parallax } from "@/components/landing/Parallax";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Neuro } from "@/components/mascot/Neuro";
import { LoginForm } from "@/components/auth/LoginForm";
import { Section, Eyebrow } from "@/components/marketing/Section";
import { DEMO_MAILTO, AUDIENCES } from "@/lib/marketing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DriveScore — AI NEET mock analysis",
  description:
    "Auto-graded NEET mocks with a diagnosis that explains WHY marks were lost — not just the score. For coaching centres, schools, and students preparing on their own.",
  openGraph: {
    title: "DriveScore — mock tests that explain why",
    description:
      "Auto-graded NEET mocks with a diagnosis that explains why marks were lost — for centres, schools, and individual aspirants.",
    type: "website",
  },
};

const DIAGNOSIS = [
  {
    icon: AlertTriangle,
    name: "Concept Gap",
    desc: "Genuinely didn't know it — flagged for re-teaching.",
    chip: "bg-[#FF5A4D]/15 text-[#FF9A91]",
    glow: "shadow-[0_0_30px_-6px_rgba(255,90,77,0.5)]",
    dot: "bg-[#FF5A4D]",
  },
  {
    icon: Gauge,
    name: "Careless Slip",
    desc: "Knew it, rushed it — easy marks left on the table.",
    chip: "bg-[#FFB020]/15 text-[#FFD27A]",
    glow: "shadow-[0_0_30px_-6px_rgba(255,176,32,0.5)]",
    dot: "bg-[#FFB020]",
  },
  {
    icon: Dices,
    name: "Guessing",
    desc: "Answered too fast to have actually worked it out.",
    chip: "bg-[#6C5CE7]/20 text-[#B7AEFF]",
    glow: "shadow-[0_0_30px_-6px_rgba(108,92,231,0.5)]",
    dot: "bg-[#6C5CE7]",
  },
  {
    icon: Hourglass,
    name: "Time Management",
    desc: "Ran out of time or left it blank — a pacing problem.",
    chip: "bg-energy/15 text-energy-soft",
    glow: "shadow-[0_0_30px_-6px_rgba(0,224,184,0.5)]",
    dot: "bg-energy",
  },
];

const REPORTS = [
  {
    icon: GraduationCap,
    who: "For the student",
    title: "Encouraging",
    desc: "What to fix next — framed as fixable habits and wins, never as failure.",
    accent: "text-energy-soft",
    ring: "ring-energy/30",
  },
  {
    icon: Stethoscope,
    who: "For the teacher",
    title: "Monday-ready",
    desc: "Exactly which chapters to re-teach, ranked by how many students struggled.",
    accent: "text-[#B7AEFF]",
    ring: "ring-[#6C5CE7]/30",
  },
  {
    icon: Users,
    who: "For the parent",
    title: "Reassuring",
    desc: "A clear, jargon-free WhatsApp-style update they actually understand.",
    accent: "text-[#FFD27A]",
    ring: "ring-[#FFB020]/30",
  },
];

const CENTRE_POINTS = [
  "Keep your faculty and your brand — DriveScore is the AI brain underneath, not a replacement.",
  "Save your teachers hours of manual grading every single weekend.",
  "Impress parents with professional, insightful reports — not just a number.",
  "Improve retention with progress that's visible and measurable.",
];

const PARENT_POINTS = [
  "See exactly where your child stands — their strengths and the specific gaps.",
  "No jargon: a simple, honest snapshot after every weekend mock.",
  "Built around effort and improvement — encouraging, never shaming.",
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Private by design",
    desc: "Every student's data is isolated at the database level (row-level security) — one student can never see another's report.",
  },
  {
    icon: EyeOff,
    title: "Answer keys stay server-side",
    desc: "Keys never reach the browser. Students see the question and the 'why' — never the key.",
  },
  {
    icon: Lock,
    title: "Supervised mocks",
    desc: "Run weekend mocks at your centre, under your supervision, on any phone or tablet.",
  },
];

export default async function WelcomePage() {
  const me = await getCurrentUser();

  return (
    <>
      <CinematicBackground />

      {/* All content sits above the cinematic background. AuroraBackground is a
          solid, fixed `z-0` layer, so the page content must establish a higher
          stacking layer (`relative z-10`) — otherwise static (non-positioned)
          text paints *behind* the background and disappears. */}
      <div className="relative z-10">
        {/* ── Hero ── */}
        <section className="mx-auto flex min-h-[84vh] max-w-4xl flex-col items-center justify-center px-5 pb-16 pt-6 text-center">
        <Parallax distance={44} className="mx-auto w-fit">
          <Reveal>
            <div className="relative mx-auto mb-2 w-fit">
              <div className="aurora-breathe absolute inset-0 -z-10 rounded-full bg-energy/25 blur-2xl" />
              <Neuro mood="welcome" size={132} />
            </div>
          </Reveal>
        </Parallax>

        <Reveal delay={0.05}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-energy/80">
            AI-powered NEET mock analysis
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Every score has{" "}
            <span className="bg-gradient-to-r from-energy via-energy-soft to-reward bg-clip-text text-transparent">
              a story
            </span>
            .
            <span className="mt-2 block">We reveal it.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
            Auto-graded NEET mocks with a diagnosis that explains{" "}
            <strong className="text-paper">why</strong> marks were lost — concept
            gaps, careless slips, guessing and pacing — for every student, every week.
          </p>
        </Reveal>

        <Reveal delay={0.28}>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a href={DEMO_MAILTO} className="btn-energy w-full sm:w-auto">
              Book a demo
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#student-login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
            >
              Student Login <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>

        <div className="scroll-cue mt-16 flex flex-col items-center gap-1 text-paper/50">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
            Scroll to discover
          </span>
          <ChevronDown className="h-5 w-5" />
        </div>
      </section>

      {/* ── The problem ── */}
      <Section eyebrow="The problem">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            A score out of 720 tells you <span className="text-pop">what</span>.
            It never tells you <span className="text-energy">why</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { t: "Static tests", d: "The same paper, no insight into how each student actually solved it." },
              { t: "Hours of grading", d: "Faculty burn their weekends correcting sheets by hand." },
              { t: "Scores without meaning", d: "A number lands home — but nobody knows what to do next." },
            ].map((p) => (
              <div
                key={p.t}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left"
              >
                <p className="font-display text-lg font-bold text-paper">{p.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{p.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <WaveDivider tint="rgba(0,224,184,0.05)" />

      {/* ── What DriveScore does (the differentiator) ── */}
      <Section eyebrow="What DriveScore does">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            We don&apos;t just grade the mock.{" "}
            <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
              We diagnose it.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">
            Using per-question timing and answers, DriveScore sorts every lost
            mark into a clear cause — so a student (and their teacher) knows
            precisely what to work on next.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DIAGNOSIS.map((d, i) => {
            const Icon = d.icon;
            return (
              <Reveal key={d.name} delay={i * 0.08}>
                <div className={`group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06] ${d.glow}`}>
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${d.chip}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${d.dot}`} />
                    <h3 className="font-display font-bold text-paper">{d.name}</h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{d.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8">
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-energy transition hover:gap-2.5"
            >
              See how the engine works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </Section>

      {/* ── Three reports ── */}
      <Section eyebrow="Three reports, three audiences">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            One mock. Three views that each land.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {REPORTS.map((r, i) => {
            const Icon = r.icon;
            return (
              <Reveal key={r.who} delay={i * 0.1}>
                <div className={`h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 ring-1 ${r.ring}`}>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                    <Icon className={`h-6 w-6 ${r.accent}`} />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/45">
                    {r.who}
                  </p>
                  <h3 className={`mt-1 font-display text-xl font-extrabold ${r.accent}`}>
                    {r.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper/65">{r.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <WaveDivider flip tint="rgba(13,148,136,0.06)" />

      {/* ── Who it's for ── */}
      <Section eyebrow="Who it's for">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            One engine.{" "}
            <span className="text-energy">Whoever runs the mock.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">
            Whether you run a coaching centre, teach at a school, or you&apos;re
            preparing on your own, DriveScore turns each mock into a clear,
            personal diagnosis.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((a, i) => {
            const Icon = [Building2, School, UserRound][i];
            return (
              <Reveal key={a.name} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-paper">
                    {a.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/65">
                    {a.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Institutional emphasis — applies to centres + schools. */}
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-4xl">
                Centres &amp; schools keep the faculty.
                <span className="block text-energy">We&apos;re the brain underneath.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="mt-7 grid gap-3.5">
                {CENTRE_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-energy" />
                    <span className="text-sm leading-relaxed text-paper/80">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href={DEMO_MAILTO} className="btn-energy w-full sm:w-auto">
                  Book a demo
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link
                  href="/for-centres"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
                >
                  See who it&apos;s for <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="hidden lg:block">
            {/* Honest placeholder — clearly marked for the founder to fill in.
                No fabricated numbers or testimonials. */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8">
              <div className="aurora-breathe absolute -right-6 -top-6 h-28 w-28 rounded-full bg-energy/20 blur-2xl" />
              <div className="flex items-center justify-center">
                <Neuro mood="cheer" size={120} />
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-energy/40 bg-energy/[0.04] p-5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-energy/80">
                  Your proof, here
                </p>
                <p className="mt-2 text-sm leading-relaxed text-paper/70">
                  [ Add a centre, school, or student&apos;s results here once you have them — kept honest, no fake numbers. ]
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── For parents ── */}
      <Section eyebrow="For parents">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              {/* WhatsApp-style mock update bubble */}
              <div className="flex items-center gap-2 text-paper/50">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Weekly update
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-paper/85">
                  This week&apos;s mock is in. Strongest in Biology 🌿. Most marks
                  slipped on a couple of <strong>careless</strong> Physics
                  questions — fixable with a slower second look.
                </div>
                <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-energy/20 px-4 py-3 text-sm leading-relaxed text-paper">
                  Thank you! That&apos;s really clear 🙏
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-paper/40">
                Illustrative example — not real student data.
              </p>
            </div>
          </Reveal>

          <div className="order-1 lg:order-2">
            <Reveal>
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                Know exactly where your child stands.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="mt-7 grid gap-3.5">
                {PARENT_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-reward" />
                    <span className="text-sm leading-relaxed text-paper/80">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Section>

      <WaveDivider tint="rgba(0,224,184,0.05)" />

      {/* ── Trust ── */}
      <Section eyebrow="Trust & privacy">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            Credible by construction.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TRUST_POINTS.map((t, i) => {
            const Icon = t.icon;
            return (
              <Reveal key={t.title} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display font-bold text-paper">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{t.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-20">
        <Reveal>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-energy/20 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 py-14 text-center sm:px-12">
            <div className="aurora-breathe absolute left-1/2 top-0 -z-0 h-48 w-48 -translate-x-1/2 rounded-full bg-energy/25 blur-3xl" />
            <div className="relative z-10">
              <Parallax distance={36} className="mx-auto mb-5 w-fit">
                <Neuro mood="welcome" size={96} />
              </Parallax>
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                Make every mock count.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-paper/70">
                Centre, school, or studying solo — give every mock a diagnosis,
                not just a score. Book a demo or sign in to start.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={DEMO_MAILTO} className="btn-energy w-full sm:w-auto">
                  <Mail className="h-5 w-5" />
                  Book a demo
                </a>
                <a
                  href="#student-login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
                >
                  Student Login <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Student Login ── */}
      <section id="student-login" className="px-5 py-16">
        <div className="mx-auto max-w-sm">
          <Reveal>
            <div className="mb-6 text-center">
              <div className="flex justify-center">
                <Eyebrow>Student access</Eyebrow>
              </div>
              <h2 className="mt-3 font-display text-2xl font-extrabold text-paper">
                Sign in to take your mock
              </h2>
              <p className="mt-2 text-sm text-paper/55">
                Your account is created by your coaching centre — no sign-up needed.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            {me ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-sm">
                <p className="text-sm text-paper/70">
                  You&apos;re signed in as <span className="font-semibold text-energy">{me.profile.fullName ?? me.email}</span>.
                </p>
                <a
                  href={landingFor(me.profile.role)}
                  className="btn-energy mt-4 inline-flex"
                >
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm">
                <LoginForm embedded theme="dark" />
              </div>
            )}
          </Reveal>
        </div>
      </section>
      </div>
    </>
  );
}
