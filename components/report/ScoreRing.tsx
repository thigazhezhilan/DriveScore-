"use client";

/**
 * Animated circular score ring — the report's headline number.
 *
 * Presentation only (the score itself is computed server-side). On reveal the
 * ring fills from empty and the number counts up from 0; a soft "level-up"
 * glow adds energy without inventing any XP/level system. All motion is
 * reduced-motion-safe (it snaps to the final state instead).
 */

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useCountUp } from "@/components/motion/useCountUp";

export function ScoreRing({
  score,
  max,
  size = 184,
  stroke = 15,
}: {
  score: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const gradId = `ringGrad-${uid}`;

  // Clamp to 0..max for the visual (score can be negative with −1 marking).
  const pct = max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
  const display = useCountUp(score, { duration: 1200 });

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const strong = pct >= 0.6;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      {/* Soft level-up glow behind the ring (brighter on a strong result). */}
      <motion.div
        aria-hidden
        className="absolute rounded-full bg-energy/30 blur-2xl"
        style={{ width: size * 0.8, height: size * 0.8 }}
        initial={reduce ? false : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: strong ? 0.9 : 0.45, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.2 }}
      />

      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--energy-soft)" />
            <stop offset="55%" stopColor="var(--energy)" />
            <stop offset="100%" stopColor="var(--energy-deep)" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-black/[0.06]"
        />
        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={reduce ? false : { strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c}` }}
          transition={reduce ? { duration: 0 } : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(0,224,184,0.45))" }}
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="font-display text-[44px] font-extrabold leading-none text-ink tabular-nums">
          {display}
        </span>
        <span className="mt-1 text-xs font-semibold text-ink/50">of {max}</span>
      </div>
    </div>
  );
}
