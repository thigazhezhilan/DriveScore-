"use client";

import { useTranslations } from "next-intl";

type Band = { ring: string; text: string; bg: string };

function band(confidence: number): Band {
  if (confidence >= 80)
    return { ring: "ring-emerald-200", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (confidence >= 60)
    return { ring: "ring-amber-200", text: "text-amber-700", bg: "bg-amber-50" };
  return { ring: "ring-slate-200", text: "text-slate-600", bg: "bg-slate-50" };
}

export function ConfidencePill({
  confidence,
  reason,
}: {
  confidence: number;
  reason?: string;
}) {
  const t = useTranslations("report");
  const b = band(confidence);
  const label = t("confidenceSure", { pct: confidence });
  return (
    <span
      title={reason}
      aria-label={`Diagnosis confidence ${confidence}%${reason ? `: ${reason}` : ""}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${b.bg} ${b.text} ${b.ring}`}
    >
      {label}
    </span>
  );
}
