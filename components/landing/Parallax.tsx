"use client";

/**
 * Scroll parallax for foreground layers (client island).
 *
 * Translates its children vertically as they pass through the viewport, so a
 * wrapped element drifts at a different speed than the 3D/aurora background —
 * giving the page real layered depth. Under `prefers-reduced-motion` it renders
 * statically (no transform, no jank).
 */

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function Parallax({
  children,
  distance = 50,
  className,
}: {
  children: ReactNode;
  /** Total travel in px across the element's pass through the viewport. */
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
