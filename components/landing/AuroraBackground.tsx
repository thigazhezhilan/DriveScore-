/**
 * Cinematic aurora backdrop for the public landing page — also the lighter
 * fallback for the WebGL hero.
 *
 * Deliberately CSS/SVG-only and dependency-free for speed + reliability on
 * cheap phones: the colour fields are soft radial gradients (no expensive
 * `blur` filters) animated purely with GPU-composited `transform`s. To echo
 * the 3D hero's science theme, it also draws a faint glowing **DNA helix** and
 * a small **molecule** as static SVG line art (desktop only, so mobile stays
 * cheapest). The global `prefers-reduced-motion` rule freezes every animation
 * into a still (but still rich) image.
 *
 * Pure presentational markup — safe to server-render.
 */

/** A vertical sine polyline (one DNA strand) as an SVG path `d`. */
function strandPath(
  cx: number,
  amp: number,
  top: number,
  bottom: number,
  turns: number,
  phase: number,
  steps = 64,
): string {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = top + (bottom - top) * t;
    const x = cx + Math.sin(t * turns * Math.PI * 2 + phase) * amp;
    d += (i === 0 ? "M" : " L") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
}

/** Base-pair rungs connecting the two strands. */
function strandRungs(
  cx: number,
  amp: number,
  top: number,
  bottom: number,
  turns: number,
  steps = 20,
) {
  const segs: { x1: number; x2: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = top + (bottom - top) * t;
    const ang = t * turns * Math.PI * 2;
    segs.push({ x1: cx + Math.sin(ang) * amp, x2: cx + Math.sin(ang + Math.PI) * amp, y });
  }
  return segs;
}

export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* deep base */}
      <div className="absolute inset-0 bg-[#06140f]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#0c2b24_0%,#06140f_62%)]" />

      {/* drifting colour fields (soft gradients = cheap, no blur filter) */}
      <div
        className="aurora-a absolute -left-[20%] -top-[15%] h-[70vh] w-[70vh] rounded-full"
        style={{ background: "radial-gradient(circle at center, rgba(0,224,184,0.30), transparent 65%)" }}
      />
      <div
        className="aurora-b absolute -right-[15%] top-[4%] h-[65vh] w-[65vh] rounded-full"
        style={{ background: "radial-gradient(circle at center, rgba(13,148,136,0.28), transparent 65%)" }}
      />
      <div
        className="aurora-c absolute left-[8%] top-[45%] hidden h-[60vh] w-[60vh] rounded-full md:block"
        style={{ background: "radial-gradient(circle at center, rgba(108,92,231,0.22), transparent 65%)" }}
      />
      <div
        className="aurora-b absolute -bottom-[12%] right-[4%] h-[55vh] w-[55vh] rounded-full"
        style={{ background: "radial-gradient(circle at center, rgba(255,176,32,0.13), transparent 65%)" }}
      />

      {/* slow conic sheen behind the hero (desktop only — mobile fallback drops it) */}
      <div
        className="aurora-sheen aurora-breathe absolute left-1/2 top-[-35%] hidden h-[120vh] w-[120vh] -translate-x-1/2 rounded-full md:block"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(0,224,184,0.10) 60deg, transparent 140deg, rgba(255,176,32,0.06) 220deg, transparent 320deg)",
        }}
      />

      {/* science motif — faint DNA helix (desktop only, cheap static SVG) */}
      <svg
        aria-hidden
        viewBox="0 0 220 600"
        preserveAspectRatio="xMidYMid meet"
        className="float-slow absolute right-[3%] top-1/2 hidden h-[78vh] -translate-y-1/2 md:block"
        style={{ opacity: 0.14 }}
      >
        <path d={strandPath(110, 58, 20, 580, 4, 0)} fill="none" stroke="#00E0B8" strokeWidth={2} />
        <path d={strandPath(110, 58, 20, 580, 4, Math.PI)} fill="none" stroke="#7CF0DD" strokeWidth={2} />
        {strandRungs(110, 58, 20, 580, 4).map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} stroke="#00E0B8" strokeWidth={1.2} opacity={0.5} />
        ))}
      </svg>

      {/* science motif — faint molecule (desktop only) */}
      <svg
        aria-hidden
        viewBox="0 0 160 160"
        className="aurora-breathe absolute left-[5%] top-[16%] hidden h-36 w-36 md:block"
        style={{ opacity: 0.13 }}
      >
        {[
          [40, 40],
          [120, 52],
          [116, 120],
          [44, 116],
        ].map(([x, y], i) => (
          <line key={i} x1={80} y1={80} x2={x} y2={y} stroke="#00E0B8" strokeWidth={1.4} />
        ))}
        <circle cx={80} cy={80} r={7} fill="#7CF0DD" />
        {[
          [40, 40],
          [120, 52],
          [116, 120],
          [44, 116],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={5} fill={i === 1 ? "#FFB020" : "#00E0B8"} />
        ))}
      </svg>

      {/* vignette + bottom fade to ground the content */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_28%,transparent_42%,rgba(3,10,8,0.66)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#04100c]" />

      {/* fine film grain for a matte, premium finish */}
      <div className="grain-overlay absolute inset-0 opacity-[0.06] mix-blend-soft-light" />
    </div>
  );
}
