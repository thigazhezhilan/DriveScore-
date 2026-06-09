"use client";

/**
 * Teacher view — clean, professional, data-dense.
 * Batch-level snapshot (one student stands in for the batch), per-subject
 * marks, and a "what to re-teach" list of weak chapters, each tagged by its
 * diagnosis category.
 */

import { ClipboardList, Users2 } from "lucide-react";
import type { Report } from "@/lib/grade";
import { fmtTime } from "@/lib/grade";
import { CATEGORY_META } from "@/lib/diagnose";
import { CATEGORY_STYLES, SUBJECT_STYLES } from "@/components/categoryStyles";
import { DEMO_STUDENTS } from "@/data/questions";

export function TeacherView({ report }: { report: Report }) {
  const student = DEMO_STUDENTS[0];

  return (
    <div className="grid gap-5">
      {/* Batch snapshot header */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              {student.className}
            </p>
            <h3 className="font-display text-lg font-bold text-ink">
              Batch snapshot
            </h3>
          </div>
          <span className="pill bg-teal/10 text-teal-deep">
            <Users2 className="h-3.5 w-3.5" /> 1 of {DEMO_STUDENTS.length} shown
          </span>
        </div>

        <p className="mt-1 text-xs text-ink/55">
          Standing in for the batch: <strong>{student.name}</strong>. Full
          cohort analytics arrive with the database milestone.
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Metric label="Score" value={`${report.score}/${report.maxScore}`} />
          <Metric label="Accuracy" value={`${report.accuracyPct}%`} />
          <Metric label="Attempted" value={`${report.correctCount + report.wrongCount}/${report.totalQuestions}`} />
          <Metric label="Time" value={fmtTime(report.totalTimeSec)} />
        </div>
      </section>

      {/* Per-subject table */}
      <section className="card overflow-hidden">
        <div className="border-b border-black/5 px-5 py-3">
          <h4 className="font-display font-semibold text-ink">By subject</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink/45">
              <th className="px-5 py-2 font-semibold">Subject</th>
              <th className="px-2 py-2 text-center font-semibold">✓</th>
              <th className="px-2 py-2 text-center font-semibold">✗</th>
              <th className="px-2 py-2 text-center font-semibold">—</th>
              <th className="px-5 py-2 text-right font-semibold">Marks</th>
            </tr>
          </thead>
          <tbody>
            {report.bySubject.map((b) => (
              <tr key={b.subject} className="border-t border-black/[0.04]">
                <td className="px-5 py-2.5">
                  <span className={`pill ${SUBJECT_STYLES[b.subject]}`}>
                    {b.subject}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center font-medium text-emerald-600 tabular-nums">
                  {b.correct}
                </td>
                <td className="px-2 py-2.5 text-center font-medium text-rose-600 tabular-nums">
                  {b.wrong}
                </td>
                <td className="px-2 py-2.5 text-center font-medium text-slate-500 tabular-nums">
                  {b.blank}
                </td>
                <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-ink">
                  {b.marks}/{b.maxMarks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* What to re-teach */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-teal-deep" />
          <h3 className="font-display text-lg font-bold text-ink">
            What to re-teach
          </h3>
        </div>

        {report.reTeachChapters.length === 0 ? (
          <div className="card p-5 text-sm text-ink/60">
            No concept gaps flagged — nothing to re-teach from this set.
          </div>
        ) : (
          <div className="card divide-y divide-black/[0.05]">
            {report.reTeachChapters.map((wc) => {
              const meta = CATEGORY_META[wc.category];
              const style = CATEGORY_STYLES[wc.category];
              return (
                <div
                  key={`${wc.subject}-${wc.chapter}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {wc.chapter}
                    </p>
                    <p className="text-xs text-ink/50">{wc.subject}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {wc.count > 1 && (
                      <span className="text-xs font-medium text-ink/45">
                        ×{wc.count}
                      </span>
                    )}
                    <span className={`pill ${style.chipBg} ${style.chipText}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {meta.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] py-2.5">
      <p className="font-display text-base font-bold tabular-nums text-ink">
        {value}
      </p>
      <p className="text-[11px] font-medium text-ink/50">{label}</p>
    </div>
  );
}
