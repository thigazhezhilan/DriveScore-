"use client";

/**
 * The grouped "why" — the product's visual centrepiece.
 *
 * Renders each problem category as a colour-coded card: the title, the advice,
 * and the list of chapter/concept items that fell into that bucket. Shared by
 * the student and (in compact form) teacher views.
 */

import { AlertTriangle, Dices, Gauge, Hourglass, Snail } from "lucide-react";
import type { DiagnosisGroup } from "@/lib/grade";
import type { DiagnosisCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/diagnose";
import { CATEGORY_STYLES } from "@/components/categoryStyles";
import { fmtTime } from "@/lib/grade";

const ICONS: Record<DiagnosisCategory, typeof AlertTriangle> = {
  CONCEPT_GAP: AlertTriangle,
  GUESS: Dices,
  CARELESS: Gauge,
  TOO_SLOW: Snail,
  TIME_MANAGEMENT: Hourglass,
  SOLID: Gauge,
};

export function DiagnosisGroups({
  groups,
  compact = false,
}: {
  groups: DiagnosisGroup[];
  compact?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <div className="card border-l-4 border-l-emerald-500 p-5">
        <p className="font-display font-semibold text-emerald-700">
          No problem areas flagged 🎉
        </p>
        <p className="mt-1 text-sm text-ink/60">
          Every question was answered correctly and on time. Outstanding.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3.5">
      {groups.map((group, gi) => {
        const meta = CATEGORY_META[group.category];
        const style = CATEGORY_STYLES[group.category];
        const Icon = ICONS[group.category];
        return (
          <div
            key={group.category}
            className={`card animate-fade-up border-l-4 ${style.border} p-4`}
            style={{ animationDelay: `${gi * 80}ms` }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.chipBg} ${style.text}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-semibold text-ink">
                    {meta.title}
                  </h4>
                  <span
                    className={`pill ${style.chipBg} ${style.chipText}`}
                  >
                    {group.items.length}
                  </span>
                </div>
                {!compact && (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink/60">
                    {meta.advice}
                  </p>
                )}
              </div>
            </div>

            <ul className="mt-3 grid gap-2">
              {group.items.map((it) => (
                <li
                  key={it.question.id}
                  className={`flex items-center justify-between gap-3 rounded-lg ${style.softBg} px-3 py-2`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {it.question.concept}
                    </p>
                    <p className="truncate text-xs text-ink/55">
                      {it.question.subject} · {it.question.chapter}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink/45">
                    {fmtTime(it.attempt.timeSec)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
