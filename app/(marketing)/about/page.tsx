/**
 * About — DriveScore's mission and story.
 *
 * Static marketing page (public via the middleware allowlist). Copy honesty:
 * the founder/team block is a clearly-marked placeholder — no invented people,
 * history, or numbers.
 */

import type { Metadata } from "next";
import {
  Compass,
  Eye,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Telescope,
} from "lucide-react";
import { LiquidBackground } from "@/components/landing/LiquidBackground";
import { Reveal } from "@/components/landing/Reveal";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Neuro } from "@/components/mascot/Neuro";
import { Section, PageHero } from "@/components/marketing/Section";

export const metadata: Metadata = {
  title: "About DriveScore — why we exist",
  description:
    "NEET is one of India's hardest exams. DriveScore turns every weekend mock into a clear diagnosis — arming coaching centres, never replacing the teacher.",
  openGraph: {
    title: "About DriveScore",
    description:
      "Centre-first, transparent, and built for Tamil Nadu's NEET aspirants. Our mission and values.",
    type: "website",
  },
};

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Partner-first",
    desc: "We arm coaching centres and schools — we never compete with them. Your faculty, your questions, your brand stay yours. We're the brain underneath.",
  },
  {
    icon: Eye,
    title: "Transparency",
    desc: "We explain the why, not a black-box score. Every diagnosis points to a specific, fixable cause a teacher can act on.",
  },
  {
    icon: ShieldCheck,
    title: "Student wellbeing",
    desc: "We frame results as fixable habits, never as failure. A weak mock is a map of what to work on next — not a verdict.",
  },
  {
    icon: Compass,
    title: "Built for Tamil Nadu",
    desc: "Designed around how NEET prep actually runs here — for centres, schools, and students working on their own, on whatever device they have.",
  },
];

export default function AboutPage() {
  return (
    <>
      <LiquidBackground />

      <PageHero
        eyebrow="About us"
        title={
          <>
            We make every mock{" "}
            <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
              mean something
            </span>
            .
          </>
        }
        intro="DriveScore turns weekend NEET mocks into a clear diagnosis — so teachers know what to re-teach, parents understand the why, and students see a path, not just a number."
      />

      {/* Why we exist */}
      <Section eyebrow="Why we exist">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5 text-base leading-relaxed text-paper/75">
            <Reveal>
              <p>
                NEET is one of the hardest exams in India. Coaching centres and
                schools pour hours into mocks — but faculty grade them by hand,
                students working alone get no feedback at all, and parents only
                ever hear a number.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <p>
                A score out of 720 says <em className="text-paper">what</em>{" "}
                happened. It never says <em className="text-energy">why</em>. Was
                it a concept the student never learned? A careless slip under
                time pressure? A guess? A pacing problem? Those four answers need
                four completely different responses — and a raw score hides all
                of them.
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <p>
                DriveScore reads each attempt — the answers and the timing — and
                sorts every lost mark into a clear cause. The mock becomes a
                diagnosis. And it does this{" "}
                <strong className="text-paper">without replacing the teacher</strong>{" "}
                — it hands teachers a sharper map of where their class stands, and
                gives a student working solo the same clear next step.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="hidden lg:block">
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
              <div className="aurora-breathe absolute -left-6 -top-6 h-28 w-28 rounded-full bg-energy/20 blur-2xl" />
              <Neuro mood="thinking" size={140} />
              <p className="mt-4 text-sm leading-relaxed text-paper/60">
                Meet Neuro — the friendly face of the diagnosis. It frames every
                result as something fixable.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <WaveDivider tint="rgba(0,224,184,0.05)" />

      {/* Values */}
      <Section eyebrow="Our approach">
        <Reveal>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            Four principles we don&apos;t bend on.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v, i) => {
            const Icon = v.icon;
            return (
              <Reveal key={v.title} delay={i * 0.08}>
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

      {/* The team — honest placeholder */}
      <Section eyebrow="The team">
        <Reveal>
          <div className="rounded-3xl border border-dashed border-energy/40 bg-energy/[0.04] p-8 sm:p-10">
            <div className="flex items-center gap-2 text-energy/80">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                Founder — to be added
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/75">
              [ Founder name + a short, honest bio goes here — who you are, your
              background, and why you started DriveScore. We&apos;ve deliberately
              left this blank rather than invent a story. ]
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/50">
              [ Add other team members here as the team grows. No placeholders
              are presented to visitors as real people. ]
            </p>
          </div>
        </Reveal>
      </Section>

      <WaveDivider flip tint="rgba(13,148,136,0.06)" />

      {/* Vision */}
      <Section eyebrow="Our vision">
        <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr]">
          <Reveal>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-energy/10 text-energy">
              <Telescope className="h-8 w-8" />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display text-2xl font-extrabold leading-snug text-paper sm:text-4xl">
              The operating system for exam-prep diagnostics —{" "}
              <span className="text-energy">starting with NEET in Tamil Nadu.</span>
            </h2>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
