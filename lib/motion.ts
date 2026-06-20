/** Shared motion design tokens — one coherent product, not eight effects. */

import { useEffect, useRef, useState } from "react";

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

/**
 * Ease-out-expo count-up from 0 → target.
 * @param enabled   false → immediately show target (reduced-motion or not-yet-in-view)
 * @param durationMs  total animation duration
 * @param delayMs     pre-start delay before counting begins
 */
export function useCountUp(
  target: number,
  enabled: boolean,
  durationMs = 1100,
  delayMs = 0,
): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    setValue(0);
    const startAt = performance.now() + delayMs;
    const tick = (now: number) => {
      if (now < startAt) { raf.current = requestAnimationFrame(tick); return; }
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(eased * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); };
  }, [target, enabled, durationMs, delayMs]);
  return value;
}
