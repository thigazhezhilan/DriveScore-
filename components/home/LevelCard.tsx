"use client";

/**
 * Skill-level card for the student home.
 *
 * Shows the student's OVERALL level + rating, a progress bar to the next band,
 * the net change from their last attempt, and per-subject level chips. This is
 * the only surface for the rating system in v1 — deliberately no leaderboard or
 * rank number, so it motivates without the demoralisation of a raw ladder.
 *
 * Presentation only: every number comes pre-computed from the server
 * (lib/rating.ts + lib/db/ratings.ts). See docs/rating-system-spec.md.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Stethoscope, TrendingDown } from "lucide-react";
import type { RatingSummary } from "@/lib/db/ratings";
import { levelProgress } from "@/lib/rating";
import type { Subject } from "@/lib/types";

/** Per-level accent (Tailwind tokens already in the dark skin). */
const LEVEL_STYLE: Record<string, { text: string; bar: string; glow: string }> = {
  Aspirant: { text: "text-paper/70", bar: "bg-paper/40", glow: "rgba(255,255,255,0.15)" },
  Achiever: { text: "text-energy", bar: "bg-energy", glow: "rgba(0,224,184,0.55)" },
  Scholar: { text: "text-energy", bar: "bg-energy", glow: "rgba(0,224,184,0.55)" },
  Ranker: { text: "text-reward", bar: "bg-reward", glow: "rgba(255,196,84,0.55)" },
  Topper: { text: "text-reward", bar: "bg-reward", glow: "rgba(255,196,84,0.55)" },
  "White Coat": { text: "text-[#B7AEFF]", bar: "bg-accent2", glow: "rgba(124,108,255,0.6)" },
};

const SUBJECT_ABBR: Record<Subject, string> = {
  Physics: "Phy",
  Chemistry: "Chem",
  Biology: "Bio",
};

const fmt = (n: number) => n.toLocaleString("en-IN");

export function LevelCard({ rating }: { rating: RatingSummary }) {
  const reduce = useReducedMotion();
  const { overall, subjects, recentDelta } = rating;
  const style = LEVEL_STYLE[overall.level] ?? LEVEL_STYLE.Aspirant;
  const prog = levelProgress(overall.rating);

  return (
    <section className="animate-fade-up mt-4" style={{ animationDelay: "75ms" }}>
      <div className="card-glass-lg relative overflow-hidden p-5">
        <div
          className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full blur-2xl"
          style={{ background: style.glow }}
        />

        {/* Level + rating + recent change */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06]"
              style={{ boxShadow: `0 0 22px -6px ${style.glow}` }}
            >
              <Stethoscope className={`h-6 w-6 ${style.text}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
                Overall level
              </p>
              <h2 className={`font-display text-2xl font-extrabold leading-none ${style.text}`}>
                {overall.level}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <p className="font-display text-xl font-extrabold tabular-nums text-paper">
              {fmt(overall.rating)}
            </p>
            {recentDelta !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                  recentDelta > 0 ? "text-energy" : "text-[#FF9A91]"
                }`}
              >
                {recentDelta > 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {recentDelta > 0 ? "+" : ""}
                {fmt(recentDelta)}
              </span>
            )}
          </div>
        </div>

        {/* Progress to next level */}
        <div className="relative mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className={`h-full rounded-full ${style.bar}`}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${prog.pctToNext}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.15 }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-paper/50">
            {prog.next
              ? `${fmt(prog.pointsToNext ?? 0)} to ${prog.next.name}`
              : "Top level reached — White Coat 🥼"}
          </p>
        </div>

        {/* Per-subject chips */}
        {subjects.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {subjects.map((s) => {
              const ss = LEVEL_STYLE[s.level] ?? LEVEL_STYLE.Aspirant;
              return (
                <span
                  key={s.subject}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 text-xs"
                >
                  <span className="font-bold text-paper/80">{SUBJECT_ABBR[s.subject]}</span>
                  <span className={`font-semibold ${ss.text}`}>{s.level}</span>
                  <span className="tabular-nums text-paper/45">{fmt(s.rating)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
