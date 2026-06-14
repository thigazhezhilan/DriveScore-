/**
 * Who it's for — the pitch for each audience + how onboarding works.
 *
 * Static marketing page (public via the middleware allowlist; URL kept as
 * /for-centres). Covers all three audiences — coaching centres, schools, and
 * individual aspirants. No fabricated numbers or logos — the social-proof slot
 * is a clearly-marked placeholder.
 */

import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Clock,
  Heart,
  Mail,
  Rocket,
  School,
  Star,
  Upload,
  UserPlus,
  UserRound,
} from "lucide-react";
import { LiquidBackground } from "@/components/landing/LiquidBackground";
import { Reveal } from "@/components/landing/Reveal";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Neuro } from "@/components/mascot/Neuro";
import { Section, PageHero } from "@/components/marketing/Section";
import { DEMO_MAILTO, AUDIENCES } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Who it's for — DriveScore",
  description:
    "Built for coaching centres, schools, and individual NEET aspirants. Save grading hours, show parents real progress, or get the same diagnosis preparing on your own.",
  openGraph: {
    title: "Who DriveScore is for",
    description:
      "Coaching centres, schools, and students preparing on their own — every mock becomes a clear diagnosis.",
    type: "website",
  },
};

const AUDIENCE_ICONS = [Building2, School, UserRound];

const VALUE = [
  {
    icon: Clock,
    title: "Win back your weekends",
    desc: "Faculty stop grading by hand. Every mock is corrected the instant it's submitted, freeing teachers to actually teach.",
  },
  {
    icon: Heart,
    title: "Impress parents, keep students",
    desc: "Professional, insightful reports after every mock build trust with parents — and visible progress keeps students enrolled.",
  },
  {
    icon: Star,
    title: "Stay your brand",
    desc: "Your faculty, your questions, your name front and centre. DriveScore is the quiet intelligence underneath — never a competitor to you.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "We set you up",
    desc: "We create your centre, add your teachers, and walk your team through the dashboard. Nothing for you to install.",
  },
  {
    icon: Upload,
    step: "02",
    title: "You upload your papers",
    desc: "Bring your own question bank and build a weekend mock from it — your difficulty, your syllabus coverage.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Your students take mocks",
    desc: "Students sit the mock under your supervision on any device. Grades and the full diagnosis are ready the moment they submit.",
  },
];

export default function ForCentresPage() {
  return (
    <>
      <LiquidBackground />

      <PageHero
        eyebrow="Who it's for"
        title={
          <>
            One engine,{" "}
            <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
              three kinds of users.
            </span>
          </>
        }
        intro="Coaching centres, schools, and students preparing on their own — DriveScore turns every NEET mock into a clear diagnosis, without changing who teaches or whose questions you use."
      />

      <div className="mx-auto max-w-4xl px-5 text-center">
        <Reveal>
          <a href={DEMO_MAILTO} className="btn-energy">
            <Mail className="h-5 w-5" />
            Book a demo
          </a>
        </Reveal>
      </div>

      {/* Audiences */}
      <Section eyebrow="Built for">
        <div className="grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((a, i) => {
            const Icon = AUDIENCE_ICONS[i];
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
      </Section>

      <WaveDivider tint="rgba(0,224,184,0.05)" />

      {/* Value — centres & schools */}
      <Section eyebrow="Why centres & schools choose us">
        <div className="grid gap-4 md:grid-cols-3">
          {VALUE.map((v, i) => {
            const Icon = v.icon;
            return (
              <Reveal key={v.title} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-paper">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/65">
                    {v.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <WaveDivider tint="rgba(0,224,184,0.05)" />

      {/* Onboarding steps */}
      <Section eyebrow="How onboarding works (centres & schools)">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            Live in days, not months.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.step} delay={i * 0.12}>
                <div className="relative h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <span className="font-display text-4xl font-extrabold text-energy/25">
                    {s.step}
                  </span>
                  <div className="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-paper">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/65">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-8 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-paper/70">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-energy" />
            <span>
              <strong className="text-paper">Studying on your own?</strong> You
              don&apos;t need any of this setup — get in touch about individual
              access and we&apos;ll get you taking diagnosed mocks.
            </span>
          </p>
        </Reveal>
      </Section>

      {/* Social proof — honest placeholder */}
      <Section eyebrow="Real results">
        <Reveal>
          <div className="rounded-3xl border border-dashed border-energy/40 bg-energy/[0.04] p-8 text-center sm:p-10">
            <div className="flex justify-center">
              <Neuro mood="cheer" size={96} />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-energy/80">
              Your proof, here
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-paper/70">
              [ Add a centre, school, or student&apos;s results here once you
              have them — real numbers only, no fabricated stats. ]
            </p>
          </div>
        </Reveal>
      </Section>

      <WaveDivider flip tint="rgba(13,148,136,0.06)" />

      {/* CTA */}
      <Section>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-energy/20 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 py-12 text-center sm:px-12">
            <div className="aurora-breathe absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-energy/25 blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-display text-2xl font-extrabold sm:text-4xl">
                Run one mock with us.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-paper/70">
                The fastest way to see the value is to put a real mock through it.
                Centre, school, or solo — book a demo and we&apos;ll get you set up.
              </p>
              <div className="mt-7 flex justify-center">
                <a href={DEMO_MAILTO} className="btn-energy">
                  <Mail className="h-5 w-5" />
                  Book a demo <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
