/**
 * "Where your marks went" — the root-cause ranking.
 *
 * Leads with IMPACT (marks lost per cause), not raw category counts, so the
 * biggest lever is always at the top. Pure presentation over `report.rootCauses`.
 */

import type { RootCause } from "@/lib/grade";
import { CATEGORY_META } from "@/lib/diagnose";
import { CATEGORY_STYLES } from "@/components/categoryStyles";

export function RootCauses({
  rootCauses,
  title = "Where your marks went",
}: {
  rootCauses: RootCause[];
  title?: string;
}) {
  if (rootCauses.length === 0) return null;

  const max = Math.max(...rootCauses.map((r) => r.marksLost));

  return (
    <section>
      <h3 className="mb-2.5 font-display text-lg font-bold text-ink">{title}</h3>
      <div className="card divide-y divide-black/[0.05]">
        {rootCauses.map((rc) => {
          const meta = CATEGORY_META[rc.category];
          const style = CATEGORY_STYLES[rc.category];
          const pct = max > 0 ? Math.round((rc.marksLost / max) * 100) : 0;
          return (
            <div key={rc.category} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="text-sm font-semibold text-ink">
                    {meta.title}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                  −{rc.marksLost}{" "}
                  <span className="text-xs font-medium text-ink/45">marks</span>
                </span>
              </div>
              {/* Impact bar (relative to the biggest cause). */}
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
