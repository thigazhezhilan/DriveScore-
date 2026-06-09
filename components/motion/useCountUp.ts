"use client";

/**
 * Counts a number up from 0 to `target` on mount, for the report reveal.
 * Pure presentation. If the user prefers reduced motion (or it's disabled),
 * it returns the final value immediately — no animation.
 */

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function useCountUp(
  target: number,
  { duration = 1100, enabled = true }: { duration?: number; enabled?: boolean } = {},
): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce || !enabled ? target : 0);

  useEffect(() => {
    if (reduce || !enabled) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled, reduce]);

  return value;
}
