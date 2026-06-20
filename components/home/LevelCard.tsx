"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Stethoscope, TrendingDown } from "lucide-react";
import type { RatingSummary } from "@/lib/db/ratings";
import { LEVELS } from "@/lib/rating";
import type { Subject } from "@/lib/types";
import { EASE, SPRING, DUR, STAGGER } from "@/lib/motion";

function useCountUp(target: number, enabled: boolean, durationMs = 1100) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(eased * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    const id = setTimeout(() => { raf.current = requestAnimationFrame(tick); }, 350);
    return () => { clearTimeout(id); cancelAnimationFrame(raf.current); };
  }, [target, enabled, durationMs]);
  return value;
}

/** Per-level accent (Tailwind tokens already in the dark skin). */
const LEVEL_STYLE: Record<string, { text: string; bar: string; glow: string; node: string; ring: string }> = {
  Aspirant:   { text: "text-paper/70",    bar: "bg-paper/40",   glow: "rgba(255,255,255,0.15)", node: "#ffffff44", ring: "#ffffff66" },
  Achiever:   { text: "text-energy",      bar: "bg-energy",     glow: "rgba(0,224,184,0.55)",   node: "#00E0B8",   ring: "#00E0B866" },
  Scholar:    { text: "text-energy",      bar: "bg-energy",     glow: "rgba(0,224,184,0.55)",   node: "#00E0B8",   ring: "#00E0B866" },
  Ranker:     { text: "text-reward",      bar: "bg-reward",     glow: "rgba(255,196,84,0.55)",  node: "#FFC454",   ring: "#FFC45466" },
  Topper:     { text: "text-reward",      bar: "bg-reward",     glow: "rgba(255,196,84,0.55)",  node: "#FFC454",   ring: "#FFC45466" },
  "White Coat": { text: "text-[#B7AEFF]", bar: "bg-accent2",    glow: "rgba(124,108,255,0.6)",  node: "#B7AEFF",   ring: "#B7AEFF66" },
};

const SUBJECT_ABBR: Record<Subject, string> = {
  Physics: "Phy",
  Chemistry: "Chem",
  Biology: "Bio",
};

const LEVEL_EMOJI: Record<string, string> = {
  Aspirant: "🌱",
  Achiever: "⚡",
  Scholar: "📚",
  Ranker: "🏆",
  Topper: "🔥",
  "White Coat": "🥼",
};

const fmt = (n: number) => n.toLocaleString("en-IN");

/** Horizontal roadmap replacing the old progress bar */
function LevelRoadmap({
  currentLevel,
  rating,
}: {
  currentLevel: string;
  rating: number;
}) {
  const reduce = useReducedMotion();
  const t = useTranslations("home");
  const currentIdx = LEVELS.findIndex((l) => l.name === currentLevel);

  /* fraction progress inside the current segment (0–1) */
  const segmentPct = (() => {
    const cur = LEVELS[currentIdx];
    const next = LEVELS[currentIdx + 1] ?? null;
    if (!next) return 1;
    const span = next.floor - cur.floor;
    const into = rating - cur.floor;
    return Math.max(0, Math.min(1, into / span));
  })();

  /* total fill fraction across the whole track (0–1) */
  const totalFill = (currentIdx + segmentPct) / (LEVELS.length - 1);

  return (
    <div className="relative mt-5 px-1">
      {/* ── track line ── */}
      <div className="relative mx-auto" style={{ height: 4 }}>
        {/* grey base */}
        <div className="absolute inset-0 rounded-full bg-white/[0.08]" />
        {/* animated fill — triggers on scroll-into-view */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, #00E0B8 0%, #FFC454 60%, #B7AEFF 100%)`,
          }}
          initial={reduce ? false : { width: "0%" }}
          whileInView={{ width: `${totalFill * 100}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: DUR.fill, ease: EASE, delay: 0.2 }}
        />
      </div>

      {/* ── nodes ── */}
      <div
        className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center"
        style={{ top: 2 }} /* align to track center */
      >
        {LEVELS.map((level, idx) => {
          const isDone    = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const style     = LEVEL_STYLE[level.name] ?? LEVEL_STYLE.Aspirant;

          /* horizontal position along the track */
          const leftPct = (idx / (LEVELS.length - 1)) * 100;

          return (
            <div
              key={level.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${leftPct}%`, top: "50%" }}
            >
              {/* pulse ring for current node */}
              {isCurrent && !reduce && (
                <motion.div
                  className="absolute rounded-full"
                  style={{ background: style.ring, width: 28, height: 28 }}
                  animate={{ scale: [1, 1.7, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* node circle */}
              <motion.div
                className="relative flex items-center justify-center rounded-full border-2 text-[9px] font-black"
                style={{
                  width:  isCurrent ? 22 : 16,
                  height: isCurrent ? 22 : 16,
                  borderColor: isDone || isCurrent ? style.node : "rgba(255,255,255,0.15)",
                  background:  isDone ? style.node : isCurrent ? style.node + "33" : "rgba(255,255,255,0.04)",
                  boxShadow:   isCurrent ? `0 0 14px 2px ${style.ring}` : "none",
                  color:       isDone ? "#0a0f0d" : style.node,
                }}
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + idx * STAGGER, ...SPRING, stiffness: 200, damping: 18 }}
              >
                {isDone ? "✓" : isCurrent ? "" : ""}
              </motion.div>

              {/* label below node */}
              <motion.div
                className="mt-2.5 flex flex-col items-center gap-0.5"
                initial={reduce ? false : { opacity: 0, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 + idx * STAGGER, ease: EASE }}
              >
                <span className="text-[10px] leading-none" style={{ opacity: isCurrent ? 1 : isDone ? 0.7 : 0.3 }}>
                  {LEVEL_EMOJI[level.name]}
                </span>
                <span
                  className="text-center font-semibold leading-none"
                  style={{
                    fontSize: 9,
                    maxWidth: 44,
                    color:    isCurrent ? style.node : isDone ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)",
                    fontWeight: isCurrent ? 800 : 600,
                  }}
                >
                  {level.name}
                </span>
              </motion.div>

              {/* "You" pin above current node */}
              {isCurrent && (
                <motion.div
                  className="absolute -top-7 flex flex-col items-center"
                  initial={reduce ? false : { opacity: 0, y: -6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.65, ...SPRING, stiffness: 180, damping: 14 }}
                >
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-wide"
                    style={{ background: style.node, color: "#0a0f0d" }}
                  >
                    {t("youPin")}
                  </span>
                  {/* tiny pointer */}
                  <div
                    className="h-1.5 w-0.5 rounded-b-full"
                    style={{ background: style.node }}
                  />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* spacer so labels below don't clip */}
      <div style={{ paddingBottom: 44 }} />
    </div>
  );
}

export function LevelCard({ rating }: { rating: RatingSummary }) {
  const reduce = useReducedMotion();
  const t = useTranslations("home");
  const { overall, subjects, recentDelta } = rating;
  const style = LEVEL_STYLE[overall.level] ?? LEVEL_STYLE.Aspirant;
  const displayRating = useCountUp(overall.rating, !reduce);

  const currentIdx  = LEVELS.findIndex((l) => l.name === overall.level);
  const nextLevel   = LEVELS[currentIdx + 1] ?? null;
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.floor - overall.rating) : null;

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
                {t("overallLevel")}
              </p>
              <h2 className={`font-display text-2xl font-extrabold leading-none ${style.text}`}>
                {overall.level}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <p className="font-display text-xl font-extrabold tabular-nums text-paper">
              {fmt(displayRating)}
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

        {/* Roadmap replaces the old progress bar */}
        <LevelRoadmap currentLevel={overall.level} rating={overall.rating} />

        {/* Caption under roadmap */}
        <p className="text-[11px] font-medium text-paper/50 -mt-2">
          {pointsToNext !== null
            ? t("pointsToNext", { points: fmt(pointsToNext), next: nextLevel!.name })
            : t("topLevelReached")}
        </p>

        {/* Per-subject chips */}
        {subjects.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {subjects.map((s, idx) => {
              const ss = LEVEL_STYLE[s.level] ?? LEVEL_STYLE.Aspirant;
              return (
                <motion.span
                  key={s.subject}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 text-xs"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + idx * STAGGER, ease: EASE, duration: DUR.fast }}
                >
                  <span className="font-bold text-paper/80">{SUBJECT_ABBR[s.subject]}</span>
                  <span className={`font-semibold ${ss.text}`}>{s.level}</span>
                  <span className="tabular-nums text-paper/45">{fmt(s.rating)}</span>
                </motion.span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
