"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { Neuro } from "@/components/mascot/Neuro";
import { TodayCard } from "./TodayCard";
import { WeekCard } from "./WeekCard";
import { RevisitCard } from "./RevisitCard";
import type { FocusData } from "@/lib/db/focus";

export function FocusClient({ data }: { data: FocusData }) {
  const reduce = useReducedMotion();
  const t = useTranslations("focus");

  const hasFocus = !!data.prescription;

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-12 pt-7">
        {/* Back nav */}
        <header className="animate-fade-up flex items-center gap-3">
          <Link
            href="/"
            className="btn-ghost-dark flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("back")}
          </Link>
        </header>

        {/* Page title */}
        <div className="animate-fade-up mt-5 flex items-center gap-2.5" style={{ animationDelay: "40ms" }}>
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_16px_-4px_rgba(0,224,184,0.8)]">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-paper">
            {t("pageTitle")}
          </h1>
        </div>

        {hasFocus ? (
          <div className="mt-6 flex flex-col gap-4">
            {/* Today's focus + Start Practice */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
            >
              <TodayCard prescription={data.prescription!} />
            </motion.div>

            {/* This week's frontier progress */}
            {data.frontier && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.14 }}
              >
                <WeekCard frontier={data.frontier} />
              </motion.div>
            )}

            {/* Revisit (only when a decayed gate qualifies) */}
            {data.revisit && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
              >
                <RevisitCard revisit={data.revisit} />
              </motion.div>
            )}
          </div>
        ) : (
          /* Empty state */
          <motion.div
            className="mt-16 flex flex-col items-center gap-5 text-center"
            initial={reduce ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Neuro mood="thinking" size={100} />
            <div>
              <p className="font-display text-lg font-bold text-paper">
                {t("emptyTitle")}
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-paper/60">
                {t("emptyBody")}
              </p>
            </div>
            <Link href="/road" className="btn-energy px-5 py-2.5 text-sm">
              {t("goRoad")}
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
