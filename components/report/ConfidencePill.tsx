/**
 * A tiny chip showing how confident the engine is in a diagnosis (0–100).
 *
 * Pure presentation. The colour bands give an at-a-glance read (green = sure,
 * amber = likely, slate = tentative); the `reason` shows on hover/focus as the
 * native tooltip so the number is always explainable.
 */

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
  const b = band(confidence);
  return (
    <span
      title={reason}
      aria-label={`Diagnosis confidence ${confidence}%${reason ? `: ${reason}` : ""}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${b.bg} ${b.text} ${b.ring}`}
    >
      {confidence}% sure
    </span>
  );
}
