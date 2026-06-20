"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";

/**
 * Hero h1 that reveals each line independently with a staggered fade-up.
 * Receives pre-translated strings from the server component parent so no
 * i18n work happens client-side.
 */
export function HeroHeadline({
  line1,
  accent,
  line2,
}: {
  line1: string;
  accent: string;
  line2: string;
}) {
  const reduce = useReducedMotion();

  return (
    <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
      <motion.span
        className="block"
        initial={reduce ? false : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, ease: EASE, duration: 0.7 }}
      >
        {line1}{" "}
        <span className="bg-gradient-to-r from-energy via-energy-soft to-reward bg-clip-text text-transparent">
          {accent}
        </span>
        .
      </motion.span>
      <motion.span
        className="mt-2 block"
        initial={reduce ? false : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ease: EASE, duration: 0.7 }}
      >
        {line2}
      </motion.span>
    </h1>
  );
}
