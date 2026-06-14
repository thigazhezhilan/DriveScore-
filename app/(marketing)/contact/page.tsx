/**
 * Contact — "Book a demo" form + contact details.
 *
 * Static marketing page (public via the middleware allowlist). The form is a
 * client island (<DemoForm/>) that composes a mailto: — no backend or DB. The
 * contact details are clearly-marked placeholders where not yet real.
 */

import type { Metadata } from "next";
import { Clock, Mail, MapPin } from "lucide-react";
import { LiquidBackground } from "@/components/landing/LiquidBackground";
import { Reveal } from "@/components/landing/Reveal";
import { Neuro } from "@/components/mascot/Neuro";
import { PageHero } from "@/components/marketing/Section";
import { DemoForm } from "@/components/marketing/DemoForm";
import { DEMO_EMAIL } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Contact — Book a DriveScore demo",
  description:
    "Book a demo of DriveScore — for coaching centres, schools, or individual aspirants. Tell us about you and we'll show it running on a real mock.",
  openGraph: {
    title: "Book a DriveScore demo",
    description:
      "Centre, school, or studying solo — tell us about you and we'll set up a demo on a real mock.",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <>
      <LiquidBackground />

      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let&apos;s make your mocks{" "}
            <span className="bg-gradient-to-r from-energy to-reward bg-clip-text text-transparent">
              count
            </span>
            .
          </>
        }
        intro="Centre, school, or preparing on your own — tell us a little about you and we'll show DriveScore on a real mock. No obligation, no setup needed on your side."
      />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* Form */}
          <Reveal>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="font-display text-xl font-extrabold text-paper">
                Book a demo
              </h2>
              <p className="mt-1.5 text-sm text-paper/60">
                Fill this in and your email app will open with the message ready
                to send.
              </p>
              <div className="mt-6">
                <DemoForm />
              </div>
            </div>
          </Reveal>

          {/* Contact details */}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-center">
                  <Neuro mood="welcome" size={96} />
                </div>
                <ul className="mt-5 space-y-4">
                  <ContactRow icon={Mail} label="Email">
                    <a
                      href={`mailto:${DEMO_EMAIL}`}
                      className="text-energy-soft transition hover:text-energy"
                    >
                      {DEMO_EMAIL}
                    </a>
                  </ContactRow>
                  <ContactRow icon={MapPin} label="Based in">
                    Tamil Nadu, India{" "}
                    <span className="text-paper/40">[ add full address ]</span>
                  </ContactRow>
                  <ContactRow icon={Clock} label="Response time">
                    We usually reply within a day.
                  </ContactRow>
                </ul>
              </div>
              <div className="rounded-3xl border border-dashed border-energy/40 bg-energy/[0.04] p-6 text-sm leading-relaxed text-paper/70">
                [ Add a phone number / WhatsApp here once it&apos;s ready — left
                blank rather than shown as a fake number. ]
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-energy/10 text-energy-soft">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-paper/80">{children}</p>
      </div>
    </li>
  );
}
