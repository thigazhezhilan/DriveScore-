"use client";

import { Sparkles, Target, Timer, Lock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Report } from "@/lib/grade";
import { fmtTime } from "@/lib/grade";
import { ScoreRing } from "./ScoreRing";
import { DiagnosisGroups } from "./DiagnosisGroups";
import { DiagnosisRadar } from "./DiagnosisRadar";
import { ArchetypeBadge } from "./ArchetypeBadge";
import { Confetti } from "./Confetti";
import { Neuro } from "@/components/mascot/Neuro";

const STRONG_AT = 70;

function headlineKey(accuracyPct: number): string {
  if (accuracyPct >= 80) return "headline80";
  if (accuracyPct >= STRONG_AT) return "headline70";
  if (accuracyPct >= 45) return "headline45";
  return "headline0";
}

export function StudentView({ report }: { report: Report }) {
  const reduce = useReducedMotion();
  const t = useTranslations("report");
  const strong = report.accuracyPct >= STRONG_AT;

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.09,
        delayChildren: reduce ? 0 : 0.05,
      },
    },
  };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className="grid gap-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {strong && <Confetti />}

      {/* Score hero */}
      <motion.section
        variants={item}
        className="card-energy relative overflow-hidden p-6 text-center"
      >
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-energy-soft/40 blur-2xl" />

        {/* Neuro reacts + speaks */}
        <div className="relative mb-1 flex items-center justify-center gap-2">
          <motion.div
            initial={reduce ? false : { scale: 0.4, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.25 }}
          >
            <Neuro mood={strong ? "cheer" : "encourage"} size={104} />
          </motion.div>
          <div className="relative max-w-[200px] rounded-2xl rounded-bl-sm bg-focusink px-3.5 py-2 text-left text-sm font-semibold text-paper shadow-sm">
            {t(headlineKey(report.accuracyPct) as Parameters<typeof t>[0])}
          </div>
        </div>

        <span className="pill bg-reward/15 text-[#9a6800]">
          <Sparkles className="h-3.5 w-3.5" /> {t("yourMockResult")}
        </span>

        <div className="mt-2 grid place-items-center">
          <ScoreRing score={report.score} max={report.maxScore} />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="pill bg-energy/15 text-energy-deep">
            <Target className="h-3.5 w-3.5" /> {t("accuracy", { pct: report.accuracyPct })}
          </span>
          <span className="pill bg-black/5 text-ink/70">
            <Timer className="h-3.5 w-3.5" /> {t("totalTime", { time: fmtTime(report.totalTimeSec) })}
          </span>
        </div>

        <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
          <Stat label={t("correct")} value={report.correctCount} tone="text-energy-deep" />
          <Stat label={t("wrong")} value={report.wrongCount} tone="text-pop" />
          <Stat label={t("blank")} value={report.blankCount} tone="text-ink/45" />
        </div>
      </motion.section>

      {/* Pacing archetype (header insight) — hidden when there's too little data. */}
      {report.archetype && (
        <motion.section variants={item}>
          <ArchetypeBadge archetype={report.archetype} />
        </motion.section>
      )}

      {/* Lead with impact: where the marks actually went. */}
      <motion.section variants={item}>
        <DiagnosisRadar rootCauses={report.rootCauses} maxScore={report.maxScore} />
      </motion.section>

      {/* The centrepiece: grouped diagnosis */}
      <motion.section variants={item}>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 className="font-display text-xl font-extrabold text-ink">
            {t("whyLostMarks")}
          </h3>
          <span className="text-xs font-medium text-ink/50">{t("groupedByCause")}</span>
        </div>
        <DiagnosisGroups groups={report.groups} />
      </motion.section>

      {/* AI Tutor placeholder — v2, no real call. */}
      <motion.section
        variants={item}
        className="card-energy relative overflow-hidden border border-dashed border-energy/40 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-energy to-energy-deep text-focusink">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-display font-bold text-ink">{t("aiTutorTitle")}</h4>
              <span className="pill bg-reward/15 text-[#9a6800]">
                <Lock className="h-3 w-3" /> {t("aiTutorComingSoon")}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink/60">
              {t.rich("aiTutorBody", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-black/[0.03] py-3">
      <p className={`font-display text-2xl font-extrabold tabular-nums ${tone}`}>
        {value}
      </p>
      <p className="text-[11px] font-semibold text-ink/50">{label}</p>
    </div>
  );
}
