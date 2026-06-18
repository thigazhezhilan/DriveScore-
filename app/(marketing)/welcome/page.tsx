/**
 * DriveScore — Home (`/welcome`, the marketing site's front page).
 *
 * Bilingual (EN / TA) via next-intl. All copy comes from messages/en.json
 * and messages/ta.json under the "welcome" namespace.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  Gauge,
  Dices,
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
import { DEMO_MAILTO } from "@/lib/marketing";

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

const DIAG_ICONS = [AlertTriangle, Gauge, Dices, Hourglass];
const DIAG_STYLES = [
  { chip: "bg-[#FF5A4D]/15 text-[#FF9A91]", glow: "shadow-[0_0_30px_-6px_rgba(255,90,77,0.5)]", dot: "bg-[#FF5A4D]" },
  { chip: "bg-[#FFB020]/15 text-[#FFD27A]", glow: "shadow-[0_0_30px_-6px_rgba(255,176,32,0.5)]", dot: "bg-[#FFB020]" },
  { chip: "bg-[#6C5CE7]/20 text-[#B7AEFF]", glow: "shadow-[0_0_30px_-6px_rgba(108,92,231,0.5)]", dot: "bg-[#6C5CE7]" },
  { chip: "bg-energy/15 text-energy-soft", glow: "shadow-[0_0_30px_-6px_rgba(0,224,184,0.5)]", dot: "bg-energy" },
];

const REPORT_STYLES = [
  { icon: GraduationCap, accent: "text-energy-soft", ring: "ring-energy/30" },
  { icon: Stethoscope, accent: "text-[#B7AEFF]", ring: "ring-[#6C5CE7]/30" },
  { icon: Users, accent: "text-[#FFD27A]", ring: "ring-[#FFB020]/30" },
];

const AUDIENCE_ICONS = [Building2, School, UserRound];

const TRUST_ICONS = [ShieldCheck, EyeOff, Lock];

export default async function WelcomePage() {
  const t = await getTranslations("welcome");
  const me = await getCurrentUser();

  const CENTRE_POINTS = [t("centre0"), t("centre1"), t("centre2"), t("centre3")];
  const PARENT_POINTS = [t("parent0"), t("parent1"), t("parent2")];

  return (
    <>
      <CinematicBackground />

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
              {t("heroEyebrow")}
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {t("heroH1_1")}{" "}
              <span className="bg-gradient-to-r from-energy via-energy-soft to-reward bg-clip-text text-transparent">
                {t("heroH1Accent")}
              </span>
              .
              <span className="mt-2 block">{t("heroH1_2")}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
              {t.rich("heroPara", {
                strong: (chunks) => <strong className="text-paper">{chunks}</strong>,
              })}
            </p>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-energy w-full sm:w-auto">
                Sign up free <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#student-login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
              >
                {t("studentLogin")} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>

          <div className="scroll-cue mt-16 flex flex-col items-center gap-1 text-paper/50">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
              {t("scrollToDiscover")}
            </span>
            <ChevronDown className="h-5 w-5" />
          </div>
        </section>

        {/* ── The problem ── */}
        <Section eyebrow={t("problemEyebrow")}>
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {t.rich("problemH2", {
                pop: (chunks) => <span className="text-pop">{chunks}</span>,
                energy: (chunks) => <span className="text-energy">{chunks}</span>,
              })}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {([0, 1, 2] as const).map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left"
                >
                  <p className="font-display text-lg font-bold text-paper">{t(`prob${i}Title`)}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{t(`prob${i}Desc`)}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Section>

        <WaveDivider tint="rgba(0,224,184,0.05)" />

        {/* ── What DriveScore does ── */}
        <Section eyebrow={t("diagEyebrow")}>
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {t.rich("diagH2", {
                gradient: (chunks) => (
                  <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
                    {chunks}
                  </span>
                ),
              })}
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">
              {t("diagPara")}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([0, 1, 2, 3] as const).map((i) => {
              const Icon = DIAG_ICONS[i];
              const s = DIAG_STYLES[i];
              return (
                <Reveal key={i} delay={i * 0.08}>
                  <div className={`group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06] ${s.glow}`}>
                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.chip}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <h3 className="font-display font-bold text-paper">{t(`diag${i}Name`)}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{t(`diag${i}Desc`)}</p>
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
                {t("diagSeeHow")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </Section>

        {/* ── Three reports ── */}
        <Section eyebrow={t("reportsEyebrow")}>
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {t("reportsH2")}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {([0, 1, 2] as const).map((i) => {
              const { icon: Icon, accent, ring } = REPORT_STYLES[i];
              return (
                <Reveal key={i} delay={i * 0.1}>
                  <div className={`h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 ring-1 ${ring}`}>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                      <Icon className={`h-6 w-6 ${accent}`} />
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/45">
                      {t(`report${i}Who`)}
                    </p>
                    <h3 className={`mt-1 font-display text-xl font-extrabold ${accent}`}>
                      {t(`report${i}Title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-paper/65">{t(`report${i}Desc`)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>

        <WaveDivider flip tint="rgba(13,148,136,0.06)" />

        {/* ── Who it's for ── */}
        <Section eyebrow={t("audienceEyebrow")}>
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {t.rich("audienceH2", {
                energy: (chunks) => <span className="text-energy">{chunks}</span>,
              })}
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">
              {t("audiencePara")}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {([0, 1, 2] as const).map((i) => {
              const Icon = AUDIENCE_ICONS[i];
              return (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold text-paper">{t(`aud${i}Name`)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/65">{t(`aud${i}Desc`)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Institutional emphasis */}
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Reveal>
                <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-4xl">
                  {t.rich("centresH2", {
                    energy: (chunks) => <span className="block text-energy">{chunks}</span>,
                  })}
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
                    {t("bookDemo")}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <Link
                    href="/for-centres"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
                  >
                    {t("seeWhosFor")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.12} className="hidden lg:block">
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                <div className="aurora-breathe absolute -right-6 -top-6 h-28 w-28 rounded-full bg-energy/20 blur-2xl" />
                <div className="flex items-center justify-center">
                  <Neuro mood="cheer" size={120} />
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-energy/40 bg-energy/[0.04] p-5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-energy/80">
                    {t("yourProofHere")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-paper/70">
                    {t("yourProofBody")}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ── For parents ── */}
        <Section eyebrow={t("parentEyebrow")}>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center gap-2 text-paper/50">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    {t("weeklyUpdateLabel")}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-paper/85">
                    {t.rich("chatBubble1", {
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </div>
                  <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-energy/20 px-4 py-3 text-sm leading-relaxed text-paper">
                    {t("chatBubble2")}
                  </div>
                </div>
                <p className="mt-4 text-center text-[11px] text-paper/40">
                  {t("chatDisclaimer")}
                </p>
              </div>
            </Reveal>

            <div className="order-1 lg:order-2">
              <Reveal>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                  {t("parentH2")}
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
        <Section eyebrow={t("trustEyebrow")}>
          <Reveal>
            <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {t("trustH2")}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {([0, 1, 2] as const).map((i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-display font-bold text-paper">{t(`trust${i}Title`)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{t(`trust${i}Desc`)}</p>
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
                  {t("ctaH2")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-paper/70">
                  {t("ctaPara")}
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a href={DEMO_MAILTO} className="btn-energy w-full sm:w-auto">
                    <Mail className="h-5 w-5" />
                    {t("bookDemo")}
                  </a>
                  <a
                    href="#student-login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
                  >
                    {t("studentLogin")} <ArrowRight className="h-4 w-4" />
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
                  <Eyebrow>{t("loginEyebrow")}</Eyebrow>
                </div>
                <h2 className="mt-3 font-display text-2xl font-extrabold text-paper">
                  {t("loginH2")}
                </h2>
                <p className="mt-2 text-sm text-paper/55">
                  {t("loginSubtitle")}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              {me ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-sm">
                  <p className="text-sm text-paper/70">
                    {t("alreadySignedIn", { name: me.profile.fullName ?? me.email ?? "" })}
                  </p>
                  <a
                    href={landingFor(me.profile.role)}
                    className="btn-energy mt-4 inline-flex"
                  >
                    {t("goToDashboard")} <ArrowRight className="h-4 w-4" />
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
