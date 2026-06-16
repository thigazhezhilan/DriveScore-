"use client";

import { useTranslations } from "next-intl";
import { ClipboardList, Users2 } from "lucide-react";
import type { Report } from "@/lib/grade";
import { fmtTime } from "@/lib/grade";
import { CATEGORY_STYLES, SUBJECT_STYLES } from "@/components/categoryStyles";
import { RootCauses } from "./RootCauses";
import { ConfidencePill } from "./ConfidencePill";
import { DEMO_STUDENTS } from "@/data/questions";

export function TeacherView({ report }: { report: Report }) {
  const t = useTranslations("report");
  const td = useTranslations("diagnosis");
  const tc = useTranslations("common");
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
              {t("batchSnapshot")}
            </h3>
          </div>
          <span className="pill bg-teal/10 text-teal-deep">
            <Users2 className="h-3.5 w-3.5" /> {t("nOfShown", { total: DEMO_STUDENTS.length })}
          </span>
        </div>

        <p className="mt-1 text-xs text-ink/55">
          {t.rich("standingFor", {
            name: student.name,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Metric label={t("metricScore")} value={`${report.score}/${report.maxScore}`} />
          <Metric label={t("metricAccuracy")} value={`${report.accuracyPct}%`} />
          <Metric label={t("metricAttempted")} value={`${report.correctCount + report.wrongCount}/${report.totalQuestions}`} />
          <Metric label={t("metricTime")} value={fmtTime(report.totalTimeSec)} />
        </div>
      </section>

      {/* Per-subject table */}
      <section className="card overflow-hidden">
        <div className="border-b border-black/5 px-5 py-3">
          <h4 className="font-display font-semibold text-ink">{t("bySubjectTitle")}</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink/45">
              <th className="px-5 py-2 font-semibold">{t("colSubject")}</th>
              <th className="px-2 py-2 text-center font-semibold">✓</th>
              <th className="px-2 py-2 text-center font-semibold">✗</th>
              <th className="px-2 py-2 text-center font-semibold">—</th>
              <th className="px-5 py-2 text-right font-semibold">{tc("marks")}</th>
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

      {/* Where the marks went — root-cause ranking by impact. */}
      <RootCauses rootCauses={report.rootCauses} title={t("whereMarksWentTeacher")} />

      {/* What to re-teach */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-teal-deep" />
          <h3 className="font-display text-lg font-bold text-ink">
            {t("whatToReteach")}
          </h3>
        </div>

        {report.reTeachChapters.length === 0 ? (
          <div className="card p-5 text-sm text-ink/60">
            {t("noConceptGaps")}
          </div>
        ) : (
          <div className="card divide-y divide-black/[0.05]">
            {report.reTeachChapters.map((wc) => {
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
                    <ConfidencePill confidence={wc.avgConfidence} />
                    <span className={`pill ${style.chipBg} ${style.chipText}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {td(`${wc.category}.title`)}
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
