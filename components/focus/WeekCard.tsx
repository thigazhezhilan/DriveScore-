"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Mountain } from "lucide-react";
import type { Frontier } from "@/lib/mastery";

export function WeekCard({ frontier: f }: { frontier: Frontier }) {
  const t = useTranslations("focus");
  const reduce = useReducedMotion();

  const pct = Math.min(Math.round((f.strong / f.required) * 100), 100);
  const allDone = f.strong >= f.required;

  return (
    <div className="card-glass relative overflow-hidden p-5">
      {/* Section label */}
      <div className="mb-3 flex items-center gap-2">
        <Mountain className="h-3.5 w-3.5 text-reward" />
        <span className="text-xs font-bold uppercase tracking-wider text-paper/50">
          {t("weekHeading")}
        </span>
      </div>

      {/* Chapter + gate */}
      <p className="font-display text-base font-bold text-paper">{f.chapter}</p>
      <p className="mt-0.5 text-xs text-paper/55">
        {t("weekGate", { gateLabel: f.gateLabel })}
        {" · "}
        {f.subject}
      </p>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-paper/60">
            {allDone
              ? t("weekReady", { required: f.required })
              : t("weekProgress", { strong: f.strong, required: f.required })}
          </span>
          <span className="font-bold text-reward">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-reward/80 to-reward"
            style={{ width: `${pct}%` }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-paper/30">
          <span>0</span>
          <span>{f.required} {t("strongLabel")}</span>
        </div>
      </div>
    </div>
  );
}
