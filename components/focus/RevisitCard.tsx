"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { RotateCcw, Loader2 } from "lucide-react";
import { startRevisitPractice } from "@/app/focus/actions";
import type { Revisit } from "@/lib/db/focus";

export function RevisitCard({ revisit: r }: { revisit: Revisit }) {
  const t = useTranslations("focus");
  const reduce = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const handleRevisit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("subject", r.subject);
      fd.set("chapter", r.chapter);
      fd.set("gate",    r.gate);
      await startRevisitPractice(fd);
    });
  };

  return (
    <div className="card-glass relative overflow-hidden border border-[#FFB020]/20 p-5">
      {/* Warm amber glow */}
      <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#FFB020]/10 blur-2xl" />

      {/* Label */}
      <div className="mb-2 flex items-center gap-2">
        <RotateCcw className="h-3.5 w-3.5 text-[#FFD27A]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#FFD27A]/80">
          {t("revisitHeading")}
        </span>
      </div>

      {/* Chapter + gate */}
      <p className="font-display text-base font-bold text-paper">
        {r.chapter}
      </p>
      <p className="mt-0.5 text-xs text-paper/55">
        {r.gateLabel} · {r.subject}
      </p>

      {/* Gentle explanation */}
      <p className="mt-2 text-sm text-paper/55">{t("revisitWhy")}</p>

      {/* CTA */}
      <button
        onClick={handleRevisit}
        disabled={isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FFB020]/30 bg-[#FFB020]/10 py-2.5 text-sm font-semibold text-[#FFD27A] transition hover:bg-[#FFB020]/20 disabled:opacity-60"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isPending ? (
            <motion.span
              key="loading"
              className="flex items-center gap-2"
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
              className="flex items-center gap-2"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <RotateCcw className="h-4 w-4" />
              {t("revisitBtn")}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
