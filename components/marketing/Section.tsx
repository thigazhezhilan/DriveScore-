/**
 * Section + eyebrow primitives shared across the marketing pages.
 *
 * `Section` is the standard max-width content shell with a thin, letter-spaced
 * uppercase eyebrow label. `PageHero` is the compact top-of-page banner used by
 * the inner pages (About, Features, …) — Home has its own cinematic hero.
 *
 * Presentational only → server components. <Reveal> islands handle the motion.
 */

import type { ReactNode } from "react";
import { Reveal } from "@/components/landing/Reveal";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-energy/60" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-energy/80">
        {children}
      </span>
    </div>
  );
}

export function Section({
  eyebrow,
  children,
  className = "",
}: {
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-6xl px-5 py-16 sm:py-20 ${className}`}>
      {eyebrow && (
        <Reveal>
          <div className="mb-7">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        </Reveal>
      )}
      {children}
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-6 pt-16 text-center sm:pt-24">
      <Reveal>
        <div className="flex justify-center">
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl">
          {title}
        </h1>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-paper/70 sm:text-lg">
          {intro}
        </p>
      </Reveal>
    </section>
  );
}
