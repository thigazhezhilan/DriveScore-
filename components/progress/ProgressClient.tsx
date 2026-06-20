"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  LineChart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { TrendChart, type ChartSeries } from "@/components/progress/TrendChart";
import type { StudentProgress, ChapterStanding } from "@/lib/db/progress";
import type { Subject } from "@/lib/types";
import { EASE, DUR, STAGGER, useCountUp } from "@/lib/motion";

// ── Colour maps ───────────────────────────────────────────────────────────────

const SUBJECT_COLOR: Record<Subject, string> = {
  Physics:   "#5EC8FF",
  Chemistry: "#FFC454",
  Biology:   "#00E0B8",
};

const SUBJECT_ABBR: Record<Subject, string> = {
  Physics:   "Phy",
  Chemistry: "Chem",
  Biology:   "Bio",
};

const LEVEL_TEXT: Record<string, string> = {
  Aspirant:     "text-paper/70",
  Achiever:     "text-energy",
  Scholar:      "text-energy",
  Ranker:       "text-reward",
  Topper:       "text-reward",
  "White Coat": "text-[#B7AEFF]",
};

const fmt     = (n: number) => n.toLocaleString("en-IN");
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Map rating onto a 0-100 bar percentage (700–1500 window). */
const barPct = (rating: number) =>
  Math.max(4, Math.min(100, Math.round(((rating - 700) / 800) * 100)));

/**
 * Semantic colour for a "needs work" bar — amber → orange → coral by severity.
 * Strong chapters keep their subject colour.
 */
function weaknessColor(rating: number): string {
  const pct = barPct(rating);
  if (pct >= 55) return "#FFB020"; // amber  — mildly weak
  if (pct >= 35) return "#FF8040"; // orange — quite weak
  return "#FF5A4D";                // coral  — very weak
}

// ── StandingRow ───────────────────────────────────────────────────────────────

function StandingRow({
  c,
  idx,
  colorOverride,
}: {
  c: ChapterStanding;
  idx: number;
  colorOverride?: string;
}) {
  const reduce   = useReducedMotion();
  const ref      = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  const color         = colorOverride ?? SUBJECT_COLOR[c.subject];
  const pct           = barPct(c.rating);
  const displayRating = useCountUp(c.rating, !reduce && isInView, 900);

  // Entrance: slide in from left and fade up when scrolled into view.
  const entered = reduce || isInView;

  return (
    <motion.div
      ref={ref}
      className="group -mx-2 min-w-0 cursor-default rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-white/[0.05]"
      initial={reduce ? false : { opacity: 0, x: -10 }}
      animate={entered ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
      transition={{ delay: idx * STAGGER, ease: EASE, duration: DUR.fast }}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate font-medium text-paper/90">
          <span className="mr-1.5 text-[10px] font-bold uppercase" style={{ color }}>
            {SUBJECT_ABBR[c.subject]}
          </span>
          {c.chapter}
        </span>
        <span className={`shrink-0 font-bold tabular-nums ${LEVEL_TEXT[c.level] ?? "text-paper"}`}>
          {fmt(displayRating)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={reduce ? false : { width: "0%" }}
          animate={{ width: entered ? `${pct}%` : "0%" }}
          transition={{
            delay: idx * STAGGER + 0.05,
            duration: DUR.fill * 0.8,
            ease: EASE,
          }}
        />
      </div>
    </motion.div>
  );
}

// ── ProgressClient ────────────────────────────────────────────────────────────

export function ProgressClient({
  progress,
  eyebrow,
  title,
  backHref = "/",
  backLabel,
}: {
  progress: StudentProgress;
  eyebrow?: string;
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const t  = useTranslations("progress");
  const tc = useTranslations("common");
  const reduce = useReducedMotion();
  const { trend, recent, strengths, weaknesses, attemptCount } = progress;

  const displayEyebrow  = eyebrow   ?? t("eyebrow");
  const displayTitle    = title     ?? t("title");
  const displayBackLabel = backLabel ?? tc("home");

  const series: ChartSeries[] = trend.map((s) => ({
    label:  s.subject,
    color:  SUBJECT_COLOR[s.subject],
    points: s.points,
  }));
  const hasTrend = attemptCount >= 2 && series.some((s) => s.points.length >= 2);

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-12 pt-7">

        {/* ── Header ── */}
        <motion.header
          className="flex items-center justify-between gap-3"
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE, duration: DUR.base }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              className="grid h-10 w-10 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_18px_-2px_rgba(0,224,184,0.6)]"
              initial={reduce ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
            >
              <LineChart className="h-5 w-5" />
            </motion.div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                {displayEyebrow}
              </p>
              <h1 className="font-display text-lg font-extrabold text-paper">
                {displayTitle}
              </h1>
            </div>
          </div>
          <Link href={backHref} className="btn-ghost-dark px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> {displayBackLabel}
          </Link>
        </motion.header>

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">

          {/* ── Rating trend chart ── */}
          <motion.section
            className="lg:col-span-2"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09, ease: EASE, duration: DUR.base }}
          >
            <div className="card-glass-lg p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display font-bold text-paper">{t("skillRating")}</h2>
              </div>

              {hasTrend ? (
                <TrendChart series={series} />
              ) : (
                <p className="rounded-xl bg-white/[0.04] px-4 py-6 text-center text-sm text-paper/60">
                  {t("noTrend")}
                </p>
              )}
            </div>
          </motion.section>

          {/* ── Strengths & weaknesses ── */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <motion.section
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 + STAGGER, ease: EASE, duration: DUR.base }}
            >
              {/* Strongest lessons */}
              <div className="card-glass min-w-0 p-4">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-energy">
                  <TrendingUp className="h-4 w-4" /> {t("strongestLessons")}
                </h3>
                <div className="grid gap-1">
                  {strengths.map((c, idx) => (
                    <StandingRow key={`${c.subject}-${c.chapter}`} c={c} idx={idx} />
                  ))}
                </div>
              </div>

              {/* Needs work */}
              <div className="card-glass min-w-0 p-4">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF9A91]">
                  <TrendingDown className="h-4 w-4" /> {t("needsWork")}
                </h3>
                <div className="grid gap-1">
                  {weaknesses.length > 0 ? (
                    weaknesses.map((c, idx) => (
                      <StandingRow
                        key={`${c.subject}-${c.chapter}`}
                        c={c}
                        idx={idx}
                        colorOverride={weaknessColor(c.rating)}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-paper/50">{t("noWeakSpots")}</p>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* ── Recent attempts — staggered whileInView ── */}
        {recent.length > 0 && (
          <section className="mt-6">
            <motion.h3
              className="mb-3 text-xs font-bold uppercase tracking-wider text-paper/45"
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ ease: EASE, duration: DUR.fast }}
            >
              {t("recentTests")}
            </motion.h3>
            <div className="grid gap-2">
              {recent.map((a, idx) => (
                <motion.div
                  key={a.attemptId}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10px" }}
                  transition={{ delay: idx * STAGGER, ease: EASE, duration: DUR.base }}
                >
                  <Link
                    href={`/report?attempt=${a.attemptId}`}
                    className="card-glass group flex cursor-pointer items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:shadow-[0_6px_24px_-8px_rgba(0,224,184,0.25)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-paper">{a.title}</p>
                      <p className="text-[11px] text-paper/50">
                        {fmtDate(a.date)} · {t("marksDisplay", { marks: a.marks, maxMarks: a.maxMarks })}
                      </p>
                    </div>
                    {a.delta !== 0 && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-bold tabular-nums ${
                          a.delta > 0 ? "text-energy" : "text-[#FF9A91]"
                        }`}
                      >
                        <ArrowUpRight
                          className={`h-3.5 w-3.5 ${a.delta < 0 ? "rotate-90" : ""}`}
                        />
                        {a.delta > 0 ? "+" : ""}
                        {fmt(a.delta)}
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
