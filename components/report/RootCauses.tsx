"use client";

import { useTranslations } from "next-intl";
import type { RootCause } from "@/lib/grade";
import { CATEGORY_STYLES } from "@/components/categoryStyles";

export function RootCauses({
  rootCauses,
  title,
}: {
  rootCauses: RootCause[];
  title?: string;
}) {
  const t = useTranslations("diagnosis");
  const tr = useTranslations("report");
  const tc = useTranslations("common");

  if (rootCauses.length === 0) return null;

  const displayTitle = title ?? tr("whereMarksWent");
  const max = Math.max(...rootCauses.map((r) => r.marksLost));

  return (
    <section>
      <h3 className="mb-2.5 font-display text-lg font-bold text-ink">{displayTitle}</h3>
      <div className="card divide-y divide-black/[0.05]">
        {rootCauses.map((rc) => {
          const style = CATEGORY_STYLES[rc.category];
          const pct = max > 0 ? Math.round((rc.marksLost / max) * 100) : 0;
          return (
            <div key={rc.category} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="text-sm font-semibold text-ink">
                    {t(`${rc.category}.title`)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                  −{rc.marksLost}{" "}
                  <span className="text-xs font-medium text-ink/45">{tc("marks")}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className={`h-full rounded-full ${style.dot}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
