/** Shared motion design tokens — one coherent product, not eight effects. */

/** Ease-out-expo cubic: fast-out, settle gently */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Spring preset for entrance pops and hover feedback */
export const SPRING = {
  type: "spring",
  stiffness: 220,
  damping: 18,
} as const;

/** Standard durations (seconds) */
export const DUR = { fast: 0.3, base: 0.45, fill: 1.1 } as const;

/** Stagger interval between sibling items (seconds) */
export const STAGGER = 0.07;
