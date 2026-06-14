/**
 * Features — the product in depth.
 *
 * Static marketing page (public via the middleware allowlist). Reuses the
 * shared DIAGNOSIS + REPORTS copy from lib/marketing so the five categories and
 * three reports stay in sync with the Home page. No fabricated stats.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Gauge,
  Layers,
  Lock,
  Sparkles,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { LiquidBackground } from "@/components/landing/LiquidBackground";
import { Reveal } from "@/components/landing/Reveal";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Section, PageHero } from "@/components/marketing/Section";
import { DIAGNOSIS, REPORTS, DEMO_MAILTO } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Features — DriveScore",
  description:
    "The diagnosis engine, instant auto-grading, three audience reports, your own question bank + mock builder, parent updates, and data privacy — explained simply.",
  openGraph: {
    title: "DriveScore features",
    description:
      "Auto-grading, a five-category diagnosis engine, three reports, your own mock builder, and privacy by design.",
    type: "website",
  },
};

const PILLARS = [
  {
    icon: Gauge,
    title: "Instant auto-grading",
    desc: "Submit a mock and it's graded in seconds — no more weekends spent correcting answer sheets by hand. Marks, accuracy, and per-subject breakdowns are ready immediately.",
  },
  {
    icon: Stethoscope,
    title: "The diagnosis engine",
    desc: "The heart of DriveScore. Every lost mark is sorted into one of five plain-language causes, using the student's answers and how long they spent on each question.",
  },
  {
    icon: Layers,
    title: "Your own question bank",
    desc: "Centres and schools upload their own papers and build mocks from their own question bank. Your content, your difficulty, your brand — DriveScore just adds the intelligence.",
  },
  {
    icon: Wrench,
    title: "Mock builder",
    desc: "Assemble a weekend mock in minutes: pick questions, set the timing, publish to your students. They take it on any phone or tablet, under your supervision.",
  },
  {
    icon: Bell,
    title: "Parent updates",
    desc: "After every mock, parents get a clear, jargon-free snapshot of how their child did and what to work on — the kind of update they actually read and trust.",
  },
  {
    icon: Lock,
    title: "Privacy by design",
    desc: "Per-student data isolation at the database level (row-level security). Answer keys never leave the server. One student can never see another's report.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <LiquidBackground />

      <PageHero
        eyebrow="Features"
        title={
          <>
            Everything a weekend mock{" "}
            <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
              should have told you
            </span>
            .
          </>
        }
        intro="Auto-grading is table stakes. The real product is the diagnosis on top — plus the tools that let a centre or school run the whole thing on its own content, and let a solo student get the same insight."
      />

      {/* Pillars */}
      <Section eyebrow="The product, end to end">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={(i % 3) * 0.08}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.06]">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy/10 text-energy-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-paper">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/65">
                    {p.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <WaveDivider tint="rgba(0,224,184,0.05)" />

      {/* The five categories */}
      <Section eyebrow="The diagnosis engine">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            Five reasons a mark gets lost.{" "}
            <span className="text-energy">Each needs a different fix.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">
            A wrong answer isn&apos;t just wrong — it&apos;s wrong for a reason.
            DriveScore names that reason so the next step is obvious.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIAGNOSIS.map((d, i) => (
            <Reveal key={d.name} delay={(i % 3) * 0.08}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${d.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${d.dot}`} />
                  {d.name}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-paper/65">
                  {d.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Three reports */}
      <Section eyebrow="Three reports, three audiences">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            One mock, written three ways.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {REPORTS.map((r, i) => (
            <Reveal key={r.who} delay={i * 0.1}>
              <div className={`h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 ring-1 ${r.ring}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/45">
                  {r.who}
                </p>
                <h3 className={`mt-1 font-display text-xl font-extrabold ${r.accent}`}>
                  {r.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/65">{r.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <WaveDivider flip tint="rgba(13,148,136,0.06)" />

      {/* CTA */}
      <Section>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-energy/20 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 py-12 text-center sm:px-12">
            <div className="aurora-breathe absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-energy/25 blur-3xl" />
            <div className="relative z-10">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-energy/15 text-energy">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-extrabold sm:text-4xl">
                See it on your own papers.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-paper/70">
                Book a demo and we&apos;ll run one of your mocks through DriveScore
                so you can see the diagnosis on questions you already know.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={DEMO_MAILTO} className="btn-energy w-full sm:w-auto">
                  Book a demo <ArrowRight className="h-5 w-5" />
                </a>
                <Link
                  href="/for-centres"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10 sm:w-auto"
                >
                  Who it&apos;s for <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
