"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Dumbbell,
  LineChart,
  Lock,
  Mountain,
  RotateCcw,
  Timer,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Neuro } from "@/components/mascot/Neuro";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { LevelCard } from "@/components/home/LevelCard";
import { Logo } from "@/components/brand/Logo";
import type { RatingSummary } from "@/lib/db/ratings";

type MockItem = {
  id: string;
  title: string;
  questionCount: number;
  attemptCount: number;
  maxAttempts: number;
  latestAttemptId: string | null;
};

export function HomeClient({
  studentName,
  mocks,
  rating,
}: {
  studentName: string | null;
  mocks: MockItem[];
  rating: RatingSummary | null;
}) {
  const reduce = useReducedMotion();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const firstName = studentName ? studentName.split(" ")[0] : null;

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-10 pt-7">
        {/* Brand + sign out */}
        <header className="animate-fade-up flex items-center justify-between gap-3">
          <Logo size={40} wordmarkClassName="text-lg text-paper" />
          <LogoutButton dark />
        </header>

        {/* Hero: Neuro + speech bubble */}
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
                <div className="relative inline-block rounded-2xl rounded-bl-sm bg-energy px-3.5 py-2 text-sm font-bold text-focusink shadow-[0_0_18px_-4px_rgba(0,224,184,0.7)]">
                  {firstName ? t("neuroBubble", { firstName }) : t("neuroBubbleNoName")}
                </div>
                <p className="mt-2 text-xs font-medium text-paper/65">
                  {t.rich("neuroIntro", {
                    bold: (chunks) => (
                      <span className="font-bold text-energy">{chunks}</span>
                    ),
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Skill level — Elo-based, motivating, no raw rank ladder */}
        {rating && <LevelCard rating={rating} />}

        {/* Quick actions — practice + road + progress (side by side on laptop) */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/practice"
            className="card-glass animate-fade-up group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            style={{ animationDelay: "90ms" }}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_18px_-4px_rgba(0,224,184,0.7)]">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-paper">{t("practiceTitle")}</p>
              <p className="text-xs text-paper/55">{t("practiceSubtitle")}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-energy transition group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/road"
            className="card-glass animate-fade-up group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            style={{ animationDelay: "95ms" }}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-reward/20 text-reward">
              <Mountain className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-paper">{t("masteryTitle")}</p>
              <p className="text-xs text-paper/55">{t("masterySubtitle")}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-energy transition group-hover:translate-x-0.5" />
          </Link>

          {rating && (
            <Link
              href="/progress"
              className="card-glass animate-fade-up group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
              style={{ animationDelay: "100ms" }}
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy/15 text-energy">
                <LineChart className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-paper">{t("progressTitle")}</p>
                <p className="text-xs text-paper/55">{t("progressSubtitle")}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-energy transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Headline */}
        <section className="animate-fade-up mt-7" style={{ animationDelay: "120ms" }}>
          <h2 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-tight text-paper">
            {t("tagline1")}
            <span className="mt-1 block">
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-energy via-energy-soft to-reward bg-clip-text text-transparent">
                  {t("tagline2")}
                </span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 bg-reward/40" />
              </span>{" "}
              {t("tagline3")}
            </span>
          </h2>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="pill bg-energy/15 text-energy">
              <Timer className="h-3.5 w-3.5" /> {t("pillTiming")}
            </span>
            <span className="pill bg-reward/15 text-reward">
              <Activity className="h-3.5 w-3.5" /> {t("pillDiagnosis")}
            </span>
            <span className="pill bg-accent2/20 text-[#B7AEFF]">{t("pillMarking")}</span>
          </div>
        </section>

        {/* Assigned mocks */}
        <section className="animate-fade-up mt-8" style={{ animationDelay: "180ms" }}>
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
              {mocks.map((m) => (
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
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
