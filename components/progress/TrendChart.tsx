"use client";

/**
 * Multi-series rating "worm" chart — hand-rolled SVG, no chart dependency.
 *
 * Plots each subject's Elo rating over time on a shared date axis, skinned for
 * the dark cinematic theme. Features: animated draw-on, gradient area fills,
 * interactive crosshair + tooltip, hover-scale dots, most-recent pulse ring,
 * and a clickable legend that toggles each series on/off.
 */

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, DUR, STAGGER } from "@/lib/motion";

export type ChartSeries = {
  label: string;
  color: string;
  points: { t: number; rating: number }[];
};

const W = 480;
const H = 200;
const PAD = { top: 16, right: 18, bottom: 26, left: 44 };
const START = 1000;

const fmt = (n: number) => n.toLocaleString("en-IN");
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const niceFloor = (v: number, step: number) => Math.floor(v / step) * step;
const niceCeil  = (v: number, step: number) => Math.ceil(v  / step) * step;

export function TrendChart({ series }: { series: ChartSeries[] }) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  // Which series are toggled on (all on by default)
  const [visible, setVisible] = useState<Record<string, boolean>>(
    () => Object.fromEntries(series.map((s) => [s.label, true])),
  );

  // Hover state: index into the shared timestamp array + snapped SVG x
  const [hover, setHover] = useState<{ tIdx: number; svgX: number } | null>(null);

  const model = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (all.length === 0) return null;

    const ts = all.map((p) => p.t);
    const rs = all.map((p) => p.rating);
    const tMin  = Math.min(...ts);
    const tMax  = Math.max(...ts);
    const yMin  = niceFloor(Math.min(...rs, START) - 20, 50);
    const yMax  = niceCeil (Math.max(...rs, START) + 20, 50);
    const tSpan = tMax - tMin || 1;
    const ySpan = yMax - yMin || 1;

    const px = (t: number) =>
      PAD.left + ((t - tMin) / tSpan) * (W - PAD.left - PAD.right);
    const py = (r: number) =>
      PAD.top + (1 - (r - yMin) / ySpan) * (H - PAD.top - PAD.bottom);

    const ticks: number[] = [];
    for (let r = yMin; r <= yMax; r += 50) ticks.push(r);

    // All subjects share the same timestamps (one point per attempt each).
    const allTs = [...new Set(all.map((p) => p.t))].sort((a, b) => a - b);

    return { tMin, tMax, yMin, yMax, px, py, ticks, allTs };
  }, [series]);

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!model || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX  = ((e.clientX - rect.left) / rect.width) * W;
    let nearestIdx = 0;
    let minDist = Infinity;
    model.allTs.forEach((t, i) => {
      const d = Math.abs(model.px(t) - svgX);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    });
    setHover({ tIdx: nearestIdx, svgX: model.px(model.allTs[nearestIdx]) });
  };

  if (!model) return null;

  const visS = series.filter((s) => visible[s.label]);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Subject rating over time"
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`fill-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity={visible[s.label] ? "0.22" : "0"} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines + y labels */}
        {model.ticks.map((r) => {
          const y = model.py(r);
          const isBase = r === START;
          return (
            <g key={r}>
              <line
                x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
                stroke={isBase ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)"}
                strokeDasharray={isBase ? "3 3" : undefined}
              />
              <text x={PAD.left - 7} y={y} fontSize="8" textAnchor="end"
                dominantBaseline="middle" fill="rgba(255,255,255,0.45)">
                {r}
              </text>
            </g>
          );
        })}

        {/* x-axis labels: first + last date */}
        <text x={PAD.left} y={H - 8} fontSize="8" fill="rgba(255,255,255,0.4)">
          {fmtDate(model.tMin)}
        </text>
        <text x={W - PAD.right} y={H - 8} fontSize="8"
          fill="rgba(255,255,255,0.4)" textAnchor="end">
          {fmtDate(model.tMax)}
        </text>

        {/* Series — area + glow + animated line + dots */}
        {series.map((s, i) => {
          if (!visible[s.label]) return null;
          const pts = s.points.map((p) => [model.px(p.t), model.py(p.rating)] as const);
          if (pts.length === 0) return null;

          const line = pts.map(([x, y], j) => `${j === 0 ? "M" : "L"}${x},${y}`).join(" ");
          const area =
            pts.length > 1
              ? `${line} L${pts[pts.length - 1][0]},${model.py(model.yMin)} L${pts[0][0]},${model.py(model.yMin)} Z`
              : "";
          const lastPt = pts[pts.length - 1];

          return (
            <g key={s.label}>
              {/* Gradient area fill */}
              {area && <path d={area} fill={`url(#fill-${i})`} />}

              {/* Soft glow underlay */}
              <path d={line} fill="none" stroke={s.color} strokeOpacity="0.2"
                strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Animated draw-on line */}
              <motion.path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: DUR.fill, delay: 0.1 + i * 0.15, ease: EASE }}
              />

              {/* Static dot markers */}
              {pts.map(([x, y], j) => (
                <circle key={j} cx={x} cy={y}
                  r={j === pts.length - 1 ? 3.5 : 2}
                  fill={s.color}
                />
              ))}

              {/* Hover-scaled dot at crosshair position */}
              {hover !== null && pts[hover.tIdx] && (
                <circle
                  cx={pts[hover.tIdx][0]}
                  cy={pts[hover.tIdx][1]}
                  r={5.5}
                  fill={s.color}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1.5}
                />
              )}

              {/* Most-recent point: ambient pulse ring */}
              {lastPt && !reduce && (
                <motion.circle
                  cx={lastPt[0]} cy={lastPt[1]} r={5}
                  fill="none" stroke={s.color} strokeWidth={1.5}
                  animate={{ r: [4, 9, 4], strokeOpacity: [0.7, 0, 0.7] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.1 + i * 0.2,
                  }}
                />
              )}
            </g>
          );
        })}

        {/* Crosshair + tooltip — rendered above series, below capture rect */}
        {hover && (
          <g pointerEvents="none">
            {/* Vertical crosshair */}
            <line
              x1={hover.svgX} y1={PAD.top} x2={hover.svgX} y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.28)" strokeWidth={1} strokeDasharray="3 3"
            />
            {(() => {
              const t    = model.allTs[hover.tIdx];
              const tipW = 90;
              const tipH = 14 + (visS.length + 1) * 13;
              const tipX = hover.svgX > W * 0.55
                ? hover.svgX - tipW - 8
                : hover.svgX + 10;
              const tipY = PAD.top + 2;
              return (
                <g>
                  <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={4}
                    fill="rgba(6,18,12,0.94)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8}
                  />
                  <text x={tipX + 7} y={tipY + 11} fontSize="8"
                    fill="rgba(255,255,255,0.5)">
                    {fmtDate(t)}
                  </text>
                  {visS.map((s, idx) => {
                    const pt = s.points[hover.tIdx];
                    if (!pt) return null;
                    return (
                      <g key={s.label}>
                        <circle cx={tipX + 9} cy={tipY + 21 + idx * 13 - 2} r={3} fill={s.color} />
                        <text x={tipX + 17} y={tipY + 21 + idx * 13}
                          fontSize="8" fill={s.color} fontWeight="bold">
                          {s.label.slice(0, 4)} {fmt(pt.rating)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </g>
        )}

        {/* Transparent mouse-capture overlay — must be last (topmost z) */}
        <rect
          x={PAD.left} y={PAD.top}
          width={W - PAD.left - PAD.right}
          height={H - PAD.top - PAD.bottom}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {/* Clickable legend — lives inside TrendChart so it can own toggle state */}
      <div className="mt-3 flex flex-wrap gap-2">
        {series.map((s, i) => (
          <motion.button
            key={s.label}
            type="button"
            onClick={() =>
              setVisible((prev) => ({ ...prev, [s.label]: !prev[s.label] }))
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{
              background: `${s.color}18`,
              border: `1px solid ${s.color}${visible[s.label] ? "50" : "25"}`,
            }}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: visible[s.label] ? 1 : 0.38, y: 0 }}
            transition={{ delay: 0.35 + i * STAGGER, ease: EASE, duration: DUR.fast }}
            whileHover={reduce ? undefined : { scale: 1.05 }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color, opacity: visible[s.label] ? 1 : 0.4 }}
            />
            <span style={{ color: visible[s.label] ? s.color : `${s.color}66` }}>
              {s.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
