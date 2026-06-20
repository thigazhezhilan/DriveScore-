"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, DUR } from "@/lib/motion";

/**
 * Drop-in replacement for a plain <div> card on the landing page.
 * Adds a GPU-composited hover lift (y: -3) while preserving all
 * existing className-based styles (shadows, borders, backgrounds).
 */
export function MotionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ ease: EASE, duration: DUR.fast }}
    >
      {children}
    </motion.div>
  );
}
