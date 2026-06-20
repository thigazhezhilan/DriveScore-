"use client";

/**
 * Hand-rolled SVG pentagon radar for the 5-category diagnosis.
 *
 * Axes: CONCEPT_GAP (top) → GUESS → CARELESS → TIME_MANAGEMENT → SELF_DOUBT
 * Score per axis: 100 − (marksLost / maxScore × 100), higher = stronger.
 * Vertex color: ≥70 emerald (strong), 50–69 amber (soft), <50 rose (weak).
 *
 * SVG renders the radar geometry only; axis labels are HTML overlays using
 * the padding-top intrinsic-ratio trick so they scale with the container and
 * Tamil multi-byte text renders natively without SVG text constraints.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { RootCause } from "@/lib/grade";
import type { DiagnosisCategory } from "@/lib/types";
import { EASE, DUR, SPRING } from "@/lib/motion";

// ── Radar geometry constants ──────────────────────────────────────────────────

const CATS: DiagnosisCategory[] = [
  "CONCEPT_GAP",      // top       (0°)
  "GUESS",            // upper-right
  "CARELESS",         // lower-right
  "TIME_MANAGEMENT",  // lower-left
  "SELF_DOUBT",       // upper-left
];

const VW = 480; const VH = 360; // SVG viewBox
const CX = 240; const CY = 168; // chart centre in SVG coords
const MAX_R = 100;              // outer ring radius
const RINGS = 4;                // concentric grid rings
const LABEL_R = 140;            // label anchor distance from centre

const ANGLES = CATS.map((_, i) => ((-90 + i * (360 / CATS.length)) * Math.PI) / 180);

function pt(r: number, i: number) {
  return { x: CX + r * Math.cos(ANGLES[i]), y: CY + r * Math.sin(ANGLES[i]) };
}
function polyPts(scores: number[]) {
  return scores.map((s, i) => { const p = pt((s / 100) * MAX_R, i); return `${p.x},${p.y}`; }).join(" ");
}
function ringPts(r: number) {
  return CATS.map((_, i) => { const p = pt(r, i); return `${p.x},${p.y}`; }).join(" ");
}

// ── Severity colours (match CATEGORY_STYLES palette) ─────────────────────────

function severityColor(score: number) {
  if (score >= 70) return "#10b981"; // emerald-500 — strong
  if (score >= 50) return "#f59e0b"; // amber-500  — soft
  return "#e11d48";                  // rose-600   — weak
}

// ── Label key lookup (type-safe, avoids template literal issues) ──────────────

type TR = ReturnType<typeof useTranslations<"report">>;
type LabelKey =
  | "radarLabel_CONCEPT_GAP"
  | "radarLabel_GUESS"
  | "radarLabel_CARELESS"
  | "radarLabel_TIME_MANAGEMENT"
  | "radarLabel_SELF_DOUBT";

const CAT_LABEL_KEY: Record<DiagnosisCategory, LabelKey | null> = {
  CONCEPT_GAP:     "radarLabel_CONCEPT_GAP",
  GUESS:           "radarLabel_GUESS",
  CARELESS:        "radarLabel_CARELESS",
  TIME_MANAGEMENT: "radarLabel_TIME_MANAGEMENT",
  SELF_DOUBT:      "radarLabel_SELF_DOUBT",
  TOO_SLOW:        null,
  SOLID:           null,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DiagnosisRadar({
  rootCauses,
  maxScore,
}: {
  /** null = loading skeleton; [] with maxScore>0 = all SOLID/TOO_SLOW (all 100s) */
  rootCauses: RootCause[] | null;
  maxScore: number;
}) {
  const tr = useTranslations("report");
  const reduce = useReducedMotion();

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (rootCauses === null) {
    return (
      <section>
        <h3 className="mb-2.5 font-display text-lg font-bold text-paper">
          {tr("whereMarksWent")}
        </h3>
        <div className="card-glass animate-pulse p-5">
          <div className="mx-auto aspect-[4/3] w-full max-w-sm rounded-2xl bg-white/[0.05]" />
          <div className="mt-4 flex justify-center gap-6">
            {[80, 60, 72].map((w, k) => (
              <div key={k} className="h-3 rounded-full bg-white/[0.05]" style={{ width: w }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (maxScore === 0) {
    return (
      <section>
        <h3 className="mb-2.5 font-display text-lg font-bold text-paper">
          {tr("whereMarksWent")}
        </h3>
        <div className="card-glass p-6 text-center">
          <p className="text-sm font-semibold text-paper">{tr("radarEmpty")}</p>
          <p className="mt-1 text-xs text-paper/50">{tr("radarEmptySub")}</p>
        </div>
      </section>
    );
  }

  // ── Compute scores ───────────────────────────────────────────────────────
  const lostMap = new Map(rootCauses.map((r) => [r.category, r.marksLost]));
  const scores = CATS.map((cat) =>
    Math.max(0, Math.round(100 - ((lostMap.get(cat) ?? 0) / maxScore) * 100)),
  );

  // ── Label meta ───────────────────────────────────────────────────────────
  const labels = CATS.map((cat, i) => {
    const pos = pt(LABEL_R, i);
    const score = scores[i];
    const color = severityColor(score);
    const align: "center" | "flex-start" | "flex-end" =
      pos.x > CX + 12 ? "flex-start" : pos.x < CX - 12 ? "flex-end" : "center";
    const xform =
      align === "center" ? "translateX(-50%)" : align === "flex-end" ? "translateX(-100%)" : "none";
    return { cat, score, pos, color, align, xform, key: CAT_LABEL_KEY[cat] };
  });

  // ── Grid ring point strings ──────────────────────────────────────────────
  const rings = Array.from({ length: RINGS }, (_, k) =>
    ringPts(((k + 1) / RINGS) * MAX_R),
  );

  return (
    <section>
      <h3 className="mb-2.5 font-display text-lg font-bold text-paper">
        {tr("whereMarksWent")}
      </h3>
      <div className="card-glass overflow-hidden p-4 sm:p-5">

        {/* Intrinsic-ratio container — labels rendered as HTML so Tamil text
            wraps naturally without SVG text overflow constraints.             */}
        <div
          className="relative mx-auto max-w-sm"
          style={{ paddingTop: `${(VH / VW) * 100}%` }}
        >
          {/* ── Radar SVG (geometry only, no text) ── */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${VW} ${VH}`}
            aria-hidden="true"
          >
            {/* Grid rings */}
            {rings.map((pts, k) => (
              <polygon
                key={k}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
              />
            ))}

            {/* Radial axis lines */}
            {CATS.map((_, i) => {
              const { x, y } = pt(MAX_R, i);
              return (
                <line
                  key={i}
                  x1={CX} y1={CY} x2={x} y2={y}
                  stroke="rgba(255,255,255,0.12)" strokeWidth={1}
                />
              );
            })}

            {/* Data polygon — scales up from chart centre on mount */}
            <motion.polygon
              points={polyPts(scores)}
              fill="rgba(20,184,166,0.12)"
              stroke="#14b8a6"
              strokeWidth={2}
              strokeLinejoin="round"
              style={{ transformBox: "view-box", transformOrigin: `${CX}px ${CY}px` }}
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: DUR.fill * 0.7, ease: EASE, delay: 0.15 }}
            />

            {/* Vertex dots — staggered fade + spring pop */}
            {scores.map((s, i) => {
              const dp = pt((s / 100) * MAX_R, i);
              return (
                <motion.circle
                  key={i}
                  cx={dp.x} cy={dp.y} r={5}
                  fill={severityColor(s)}
                  stroke="white" strokeWidth={1.5}
                  style={{ transformBox: "fill-box", transformOrigin: "center center" }}
                  initial={reduce ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: 0.55 + i * 0.08,
                    ...SPRING,
                    stiffness: 280,
                    damping: 16,
                  }}
                />
              );
            })}
          </svg>

          {/* ── HTML label overlays ── */}
          {labels.map((lb, i) => (
            <div
              key={i}
              className="pointer-events-none absolute flex flex-col"
              style={{
                left: `${(lb.pos.x / VW) * 100}%`,
                top: `${(lb.pos.y / VH) * 100}%`,
                transform: lb.xform,
                alignItems: lb.align,
                maxWidth: 88,
              }}
            >
              {lb.key && (
                <span className="text-[9px] font-semibold leading-tight text-paper/55">
                  {tr(lb.key)}
                </span>
              )}
              <span
                className="text-[11px] font-extrabold tabular-nums leading-tight"
                style={{ color: lb.color }}
              >
                {lb.score}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold">
          {(
            [
              { color: "#10b981", key: "legendStrong", range: "≥70" },
              { color: "#f59e0b", key: "legendSoft", range: "50–69" },
              { color: "#e11d48", key: "legendWeak", range: "<50" },
            ] as const
          ).map(({ color, key, range }) => (
            <span key={range} className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
              <span className="text-paper/60">
                {tr(key)} {range}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
