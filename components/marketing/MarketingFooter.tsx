/**
 * Shared footer for the marketing site.
 *
 * Brand + tagline, the same section links as the navbar, a contact email, a
 * "Book a demo" CTA, social placeholders (clearly marked — not yet real), and
 * copyright. Presentational only → server component.
 */

import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS, DEMO_MAILTO, DEMO_EMAIL } from "@/lib/marketing";

export function MarketingFooter() {
  return (
    <footer className="relative z-10 mt-10 border-t border-white/10 bg-[#06140f]/70 px-5 py-14 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand + tagline */}
        <div className="lg:col-span-2">
          <Logo size={36} wordmarkClassName="text-lg text-paper" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/60">
            AI-powered diagnosis for NEET mocks — for coaching centres, schools,
            and students preparing on their own. A clear &ldquo;why&rdquo; behind
            every score.
          </p>
          <a
            href={DEMO_MAILTO}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-energy px-4 py-2.5 text-sm font-bold text-focusink transition hover:-translate-y-0.5"
          >
            Book a demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Site links */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/45">
            Explore
          </p>
          <ul className="mt-4 space-y-2.5">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-paper/70 transition hover:text-energy"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact + social */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/45">
            Get in touch
          </p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a
                href={`mailto:${DEMO_EMAIL}`}
                className="inline-flex items-center gap-1.5 text-sm text-paper/70 transition hover:text-energy"
              >
                <Mail className="h-4 w-4" /> {DEMO_EMAIL}
              </a>
            </li>
            <li>
              <Link
                href="/welcome#student-login"
                className="text-sm text-paper/70 transition hover:text-energy"
              >
                Log in
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-paper/35">
            Social — coming soon
          </p>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-paper/40">
          © {new Date().getFullYear()} DriveScore. Supervised weekend NEET mocks
          with per-student data privacy.
        </p>
        <p className="text-xs text-paper/35">Built for NEET aspirants across Tamil Nadu.</p>
      </div>
    </footer>
  );
}
