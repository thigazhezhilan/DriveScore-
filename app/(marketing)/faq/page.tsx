/**
 * FAQ — honest answers to the questions coaching-centre owners actually ask.
 *
 * Static marketing page (public via the middleware allowlist). Answers are kept
 * honest and concise — pricing and the paper/OMR option are described as they
 * truly stand (talk-to-us / planned), with no invented figures.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { LiquidBackground } from "@/components/landing/LiquidBackground";
import { Reveal } from "@/components/landing/Reveal";
import { Section, PageHero } from "@/components/marketing/Section";
import { FaqAccordion, type Faq } from "@/components/marketing/FaqAccordion";
import { DEMO_MAILTO } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "FAQ — DriveScore",
  description:
    "How DriveScore differs from student apps, whether students need tablets, data security, how questions are added, pricing, and setup time — answered honestly.",
  openGraph: {
    title: "DriveScore FAQ",
    description:
      "Honest answers on how it's different, devices, data security, adding questions, pricing, and setup time.",
    type: "website",
  },
};

const FAQS: Faq[] = [
  {
    q: "How is this different from student apps like the big test-prep brands?",
    a: "Those apps sell content directly to students. DriveScore is a tool for whoever runs the mock — your coaching centre, your school, or you preparing on your own. When an institution uses it, your faculty, questions, and brand stay front and centre; we just add auto-grading and a diagnosis underneath, and never sell to your students behind your back.",
  },
  {
    q: "Can an individual student use DriveScore without a centre?",
    a: "Yes. The diagnosis engine works the same for a solo aspirant — you take a mock and get the per-question breakdown of where marks were lost and what to fix next. The institution-only extras (your own question bank, class-wide insights for teachers) are exactly that — for institutions. If you're studying on your own, get in touch about individual access.",
  },
  {
    q: "Do students need tablets or expensive devices?",
    a: "No. Mocks are taken on any phone or tablet with a browser — at a centre under supervision, or on your own device if you're preparing solo. A paper/OMR option — where students answer on sheets and they're scanned in — is planned, so those who prefer pen-and-paper mocks aren't left out.",
  },
  {
    q: "Is our students' data secure?",
    a: "Yes, by design. Every student's data is isolated at the database level using row-level security, so one student can never see another's report. Answer keys never reach the browser — they stay on the server. You control who in your centre has access.",
  },
  {
    q: "How are questions added?",
    a: "You bring your own question bank — your papers, your difficulty, your syllabus coverage. During onboarding we help you get your questions in, and after that your teachers build weekend mocks from your bank using the mock builder. The content is always yours.",
  },
  {
    q: "What does it cost?",
    a: "Pricing depends on how you'll use it — a centre, a school, or an individual student — so we'd rather talk than quote a misleading number here. Book a demo and we'll walk through a plan that fits. There's no fabricated price on this page on purpose.",
  },
  {
    q: "How long is setup?",
    a: "Days, not months. We create your centre, add your teachers, and help you load your first paper — there's nothing for you to install. Most centres can run their first DriveScore mock the same week.",
  },
];

export default function FaqPage() {
  return (
    <>
      <LiquidBackground />

      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Straight answers,{" "}
            <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
              no spin
            </span>
            .
          </>
        }
        intro="The questions coaching-centre owners ask us most — answered honestly, including the ones we'd rather discuss than guess at on a web page."
      />

      <Section>
        <Reveal>
          <FaqAccordion items={FAQS} />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-energy/20 bg-energy/[0.04] px-6 py-7 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="font-display text-lg font-extrabold text-paper">
                Still have a question?
              </h2>
              <p className="mt-1 text-sm text-paper/65">
                We&apos;ll answer it on a quick demo — on your own mock.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <a href={DEMO_MAILTO} className="btn-energy">
                <Mail className="h-5 w-5" /> Book a demo
              </a>
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base font-semibold text-paper transition hover:bg-white/10"
              >
                See features <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
