"use client";

/**
 * Shared sticky navbar for the marketing site.
 *
 * Desktop: logo + section links + a prominent "Book a demo" CTA and a subtle
 * "Log in" link (→ /login). Mobile: collapses to an accessible hamburger menu.
 * The current section is highlighted via usePathname.
 *
 * Client component because it owns the mobile-menu open state and reads the
 * active path — but it renders no app/auth data, so it stays safe on the public
 * routes. The nav becomes more opaque once the page scrolls.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS, DEMO_MAILTO } from "@/lib/marketing";

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Subtle solidify-on-scroll so the bar stays legible over busy hero art.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/welcome" ? pathname === "/welcome" : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled
          ? "border-white/10 bg-[#06140f]/85 backdrop-blur-md"
          : "border-transparent bg-[#06140f]/40 backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/welcome" aria-label="DriveScore home" className="shrink-0">
          <Logo size={34} wordmarkClassName="text-lg text-paper" />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/5 ${
                isActive(l.href) ? "text-energy" : "text-paper/75 hover:text-paper"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-paper/70 transition hover:bg-white/5 hover:text-paper"
          >
            Log in
          </Link>
          <a
            href={DEMO_MAILTO}
            className="inline-flex items-center gap-1.5 rounded-xl bg-energy px-4 py-2 text-sm font-bold text-focusink shadow-[0_0_18px_-4px_rgba(0,224,184,0.7)] transition hover:-translate-y-0.5"
          >
            Book a demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-paper transition hover:bg-white/10 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          id="mobile-menu"
          className="border-t border-white/10 bg-[#06140f]/95 backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3 py-2.5 text-base font-semibold transition hover:bg-white/5 ${
                  isActive(l.href) ? "text-energy" : "text-paper/85"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-center text-base font-semibold text-paper transition hover:bg-white/10"
              >
                Log in
              </Link>
              <a
                href={DEMO_MAILTO}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-energy px-4 py-3 text-base font-bold text-focusink"
              >
                Book a demo <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
