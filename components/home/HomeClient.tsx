"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, DUR, STAGGER, useCountUp } from "@/lib/motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Dumbbell,
  LineChart,
  Lock,
  Mountain,
  RotateCcw,
  Stethoscope,
  TrendingDown,
  Zap,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Neuro } from "@/components/mascot/Neuro";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { LevelCard } from "@/components/home/LevelCard";
import { Logo } from "@/components/brand/Logo";
import type { RatingSummary } from "@/lib/db/ratings";

// ── Types ────────────────────────────────────────────────────────────────────

type MockItem = {
  id: string;
  title: string;
  questionCount: number;
  attemptCount: number;
  maxAttempts: number;
  latestAttemptId: string | null;
};

/** Lightweight mastery snapshot serialised from the server component. */
export type MasterySnap = {
  frontier: {
    subject: string;
    chapter: string;
    gate: string;
    gateLabel: string;
    reason: string;
  } | null;
  clearedGates: number;
  totalGates: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, { text: string; bg: string }> = {
  Aspirant:    { text: "text-paper/60",   bg: "bg-white/10" },
  Achiever:    { text: "text-energy",     bg: "bg-energy/15" },
  Scholar:     { text: "text-energy",     bg: "bg-energy/15" },
  Ranker:      { text: "text-reward",     bg: "bg-reward/15" },
  Topper:      { text: "text-reward",     bg: "bg-reward/15" },
  "White Coat":{ text: "text-[#B7AEFF]", bg: "bg-accent2/15" },
};

const fmt = (n: number) => n.toLocaleString("en-IN");

// ── Component ─────────────────────────────────────────────────────────────────

export function HomeClient({
  studentName,
  mocks,
  rating,
  mastery,
}: {
  studentName: string | null;
  mocks: MockItem[];
  rating: RatingSummary | null;
  mastery: MasterySnap | null;
}) {
  const reduce = useReducedMotion();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const firstName = studentName ? studentName.split(" ")[0] : null;

  // First mock the student can still attempt — the hero primary CTA target.
  const nextMock = mocks.find((m) => m.attemptCount < m.maxAttempts) ?? null;

  const levelColor = rating
    ? (LEVEL_COLORS[rating.overall.level] ?? LEVEL_COLORS.Aspirant)
    : null;

  const heroRating = useCountUp(rating?.overall.rating ?? 0, !reduce && !!rating, 900, 280);

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-10 pt-7">
        {/* Brand + sign out */}
        <header className="animate-fade-up flex items-center justify-between gap-3">
          <Logo size={40} wordmarkClassName="text-lg text-paper" />
          <LogoutButton dark />
        </header>

        {/* ── Hero: Neuro + greeting + skill-rating stat + primary CTA ── */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: "60ms" }}>
          <div className="card-glass-lg relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-energy/25 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <motion.div
                className="shrink-0"
                initial={reduce ? false : { scale: 0.6, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.1 }}
              >
                <Neuro mood="welcome" size={120} />
              </motion.div>

              <div className="min-w-0 flex-1">
                {/* Greeting bubble — pops in after mascot entrance settles */}
                <motion.div
                  className="relative inline-block rounded-2xl rounded-bl-sm bg-energy px-3.5 py-2 text-sm font-bold text-focusink shadow-[0_0_18px_-4px_rgba(0,224,184,0.7)]"
                  initial={reduce ? false : { scale: 0.65, opacity: 0, y: 4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, type: "spring", stiffness: 260, damping: 20 }}
                >
                  {firstName ? t("neuroBubble", { firstName }) : t("neuroBubbleNoName")}
                </motion.div>

                <p className="mt-2 text-xs font-medium text-paper/65">
                  {t.rich("neuroIntro", {
                    bold: (chunks) => (
                      <span className="font-bold text-energy">{chunks}</span>
                    ),
                  })}
                </p>

                {/* ── Skill-rating stat row ── */}
                {rating && levelColor && (
                  <motion.div
                    className="mt-3 flex flex-wrap items-center gap-2"
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, ease: "easeOut" }}
                  >
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${levelColor.bg} ${levelColor.text}`}
                    >
                      <Stethoscope className="h-3 w-3" />
                      {rating.overall.level}
                    </span>
                    <span className="tabular-nums text-sm font-extrabold text-paper">
                      {fmt(heroRating)}
                    </span>
                    {rating.recentDelta !== 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                          rating.recentDelta > 0 ? "text-energy" : "text-[#FF9A91]"
                        }`}
                      >
                        {rating.recentDelta > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {rating.recentDelta > 0 ? "+" : ""}
                        {fmt(rating.recentDelta)}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* ── Primary CTA — first mock still open for attempts ── */}
            {nextMock && (
              <motion.div
                className="relative mt-4"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, ease: "easeOut", duration: 0.3 }}
              >
                <Link
                  href={`/test?mock=${nextMock.id}`}
                  className="btn-energy flex w-full cursor-pointer items-center gap-2 py-3 text-sm font-bold"
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>{nextMock.attemptCount > 0 ? t("retake") : t("startMock")}</span>
                  <span className="text-focusink/55">·</span>
                  <span className="min-w-0 flex-1 truncate font-medium opacity-80">
                    {nextMock.title}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Skill level — Elo roadmap with animated level nodes ───── */}
        {rating && <LevelCard rating={rating} />}

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {/* Practice */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09, ease: EASE, duration: DUR.base }}
          >
            <Link
              href="/practice"
              className="card-glass group flex h-full cursor-pointer items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] hover:shadow-[0_8px_28px_-8px_rgba(0,224,184,0.45)]"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_18px_-4px_rgba(0,224,184,0.7)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-paper">{t("practiceTitle")}</p>
                <p className="text-xs text-paper/55">{t("practiceSubtitle")}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-energy transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Mastery Road */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 + STAGGER, ease: EASE, duration: DUR.base }}
          >
            <Link
              href="/road"
              className="card-glass group flex h-full cursor-pointer items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] hover:shadow-[0_8px_28px_-8px_rgba(255,176,32,0.35)]"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-reward/20 text-reward transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <Mountain className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-paper">{t("masteryTitle")}</p>
                <p className="text-xs text-paper/55">{t("masterySubtitle")}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-energy transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Progress (only when rating exists) */}
          {rating ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 + STAGGER * 2, ease: EASE, duration: DUR.base }}
            >
              <Link
                href="/progress"
                className="card-glass group flex h-full cursor-pointer items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] hover:shadow-[0_8px_28px_-8px_rgba(0,224,184,0.45)]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy/15 text-energy transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <LineChart className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-paper">{t("progressTitle")}</p>
                  <p className="text-xs text-paper/55">{t("progressSubtitle")}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-energy transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {/* ── Mastery Road preview ───────────────────────────────────── */}
        {mastery && mastery.totalGates > 0 && (
          <section className="animate-fade-up mt-4" style={{ animationDelay: "110ms" }}>
            <div className="card-glass-lg relative overflow-hidden p-5">
              <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-reward/20 blur-2xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-reward/15 text-reward">
                    <Mountain className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-paper/40">
                      {t("masteryTitle")}
                    </p>
                    {mastery.frontier ? (
                      <p className="font-display text-sm font-bold leading-snug text-paper">
                        {mastery.frontier.chapter}
                        <span className="ml-1.5 font-normal text-paper/40">·</span>
                        <span className="ml-1.5 text-reward">{mastery.frontier.gateLabel}</span>
                      </p>
                    ) : (
                      <p className="font-display text-sm font-bold text-paper">
                        {t("masteryAllCleared")}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href="/road"
                  className="shrink-0 cursor-pointer rounded-xl bg-reward/10 px-3 py-1.5 text-xs font-bold text-reward transition hover:bg-reward/20"
                >
                  {t("masteryViewRoad")} →
                </Link>
              </div>

              {/* Cleared-gates progress bar */}
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[10px] text-paper/40">
                  <span>{t("masteryGatesCleared")}</span>
                  <span className="tabular-nums">
                    {mastery.clearedGates} / {mastery.totalGates}
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  {/* fill — triggers on scroll-into-view */}
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-energy via-reward to-[#B7AEFF]"
                    initial={reduce ? false : { width: 0 }}
                    whileInView={{
                      width: `${(mastery.clearedGates / mastery.totalGates) * 100}%`,
                    }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: DUR.fill, ease: "easeOut", delay: 0.4 }}
                  />
                  {/* shimmer sweep — rides over the fill after it lands */}
                  {!reduce && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-12"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
                      initial={{ x: "-3rem" }}
                      whileInView={{ x: "calc(100vw + 3rem)" }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.55, duration: 0.75, ease: EASE }}
                    />
                  )}
                </div>
                {mastery.frontier?.reason && (
                  <p className="mt-2 text-[11px] italic text-paper/40">
                    {mastery.frontier.reason}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Assigned mocks ─────────────────────────────────────────── */}
        <section className="animate-fade-up mt-8" style={{ animationDelay: "150ms" }}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-paper/45">
            {t("yourMocks")}
          </h3>

          {mocks.length === 0 ? (
            <div className="card-glass-lg flex items-center gap-3 p-5">
              <Neuro mood="thinking" size={84} />
              <div>
                <p className="font-display font-bold text-paper">{t("noMocksTitle")}</p>
                <p className="mt-1 text-sm text-paper/60">{t("noMocksBody")}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mocks.map((m) => {
                const pct =
                  m.maxAttempts > 0 ? Math.min(1, m.attemptCount / m.maxAttempts) : 0;
                return (
                  <div key={m.id} className="card-glass flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy/15 text-energy">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-paper">{m.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-paper/55">
                          <span>{tc("questionCount", { count: m.questionCount })}</span>
                          {m.attemptCount > 0 && (
                            <span className="pill bg-energy/15 text-energy">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t("attempted")}
                            </span>
                          )}
                        </div>
                        {/* attempt progress bar — only shown when multiple attempts allowed */}
                        {m.maxAttempts > 1 && (
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                            <motion.div
                              className="h-full rounded-full bg-energy/70"
                              initial={reduce ? false : { width: 0 }}
                              animate={{ width: `${pct * 100}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-3">
                      {m.attemptCount >= m.maxAttempts && m.attemptCount > 0 ? (
                        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-paper/40">
                          <Lock className="h-4 w-4" /> {t("completed")}
                        </div>
                      ) : (
                        <Link
                          href={`/test?mock=${m.id}`}
                          className="btn-energy flex-1 py-2.5 text-sm"
                        >
                          {m.attemptCount > 0 ? (
                            <>
                              {t("retake")} <RotateCcw className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              {t("startMock")} <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Link>
                      )}
                      {m.attemptCount > 0 && m.latestAttemptId && (
                        <Link
                          href={`/report?attempt=${m.latestAttemptId}`}
                          className="btn-ghost-dark px-4 py-2.5 text-sm"
                        >
                          <LineChart className="h-4 w-4 text-energy" /> {t("report")}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
