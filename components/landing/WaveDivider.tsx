/**
 * Flowing wave/curve section divider — replaces hard section edges with an
 * organic liquid transition, matching the site's liquid-flow language.
 *
 * Pure presentational SVG (no hooks/state) so it stays a server component. The
 * `flip` prop mirrors the curve vertically; `tint` sets the fill so a divider
 * can melt one tinted band into the next. Decorative → aria-hidden.
 */

export function WaveDivider({
  flip = false,
  tint = "rgba(255,255,255,0.03)",
  className = "",
}: {
  flip?: boolean;
  tint?: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none -my-px w-full leading-[0] ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={`block h-[60px] w-full sm:h-[90px] ${flip ? "rotate-180" : ""}`}
      >
        <path
          fill={tint}
          d="M0,64 C240,128 480,0 720,40 C960,80 1200,128 1440,72 L1440,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}
