/**
 * Liquid-flow background for the inner marketing pages (About, Features, …).
 *
 * A drifting mint→teal gradient-mesh field (CSS only) plus a faint film grain
 * for a matte, premium finish — no hard shapes, just soft flowing colour. Cheap
 * and SSR-safe; the mesh drift freezes gracefully under `prefers-reduced-motion`
 * via the rule in globals.css, leaving a still, gorgeous gradient.
 *
 * The Home page keeps the heavier 3D <CinematicBackground/>; every other page
 * uses this so the site feels cohesive without paying the 3D cost everywhere.
 */

export function LiquidBackground() {
  return (
    <div
      aria-hidden
      className="liquid-mesh pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Matte grain so the gradients never look flat/banded. */}
      <div className="grain-overlay absolute inset-0 opacity-[0.06]" />
    </div>
  );
}
