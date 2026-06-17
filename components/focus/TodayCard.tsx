"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Sparkles } from "lucide-react";
import { startFocusPractice } from "@/app/focus/actions";
import type { Prescription } from "@/lib/db/mastery";
import type { Gate } from "@/lib/mastery";

function estimateMinutes(gate: Gate, count: number): number {
  const minsPerQ = gate === "FOUNDATION" ? 2 : gate === "APPLICATION" ? 3 : 4;
  return Math.round(count * minsPerQ);
}

export function TodayCard({ prescription: p }: { prescription: Prescription }) {
  const t = useTranslations("focus");
  const reduce = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const minutes = estimateMinutes(p.gate, p.recommendedCount);

  const handleStart = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("subject", p.subject);
      fd.set("chapter", p.chapter);
      fd.set("gate",    p.gate);
      await startFocusPractice(fd);
    });
  };

  return (
    <div className="card-glass-lg relative overflow-hidden p-5">
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-energy/20 blur-2xl" />

      {/* Section label */}
      <div className="mb-3 flex items-center gap-2">
        <span className="pill bg-energy/15 text-energy text-xs font-bold">
          <Sparkles className="h-3 w-3" />
          {t("todayHeading")}
        </span>
        <span className="text-xs text-paper/40">{t("todayTime", { min: minutes })}</span>
      </div>

      {/* Main action */}
      <p className="font-display text-[17px] font-extrabold leading-snug tracking-tight text-paper">
        {t("todayAction", {
          count: p.recommendedCount,
          gateLabel: p.gateLabel,
          chapter: p.chapter,
        })}
      </p>

      {/* Reason / encouragement */}
      <p className="mt-2 text-sm text-paper/60">{p.reason}</p>

      {/* Textbook reference placeholder — shown if chapter ref exists */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-paper/50">
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-energy/70" />
        <span>{p.subject} · {p.chapter}</span>
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        disabled={isPending}
        className="btn-energy mt-4 w-full py-3 text-sm disabled:opacity-60"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isPending ? (
            <motion.span
              key="loading"
              className="flex items-center justify-center gap-2"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("generating")}
            </motion.span>
          ) : (
            <motion.span
              key="ready"
              className="flex items-center justify-center gap-2"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {t("startBtn")} <ArrowRight className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
