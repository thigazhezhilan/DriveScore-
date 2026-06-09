"use client";

/**
 * A tasteful one-shot confetti burst (~1s) for a strong result.
 *
 * Pure presentation: a fixed, pointer-events-none overlay of small coloured
 * pieces that burst up-and-out from the upper centre and fall away, then the
 * component unmounts itself. Honours `prefers-reduced-motion` by rendering
 * nothing at all (no large motion for users who opted out).
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["var(--energy)", "var(--reward)", "var(--pop)", "var(--accent2)", "var(--energy-soft)"];

type Piece = {
  dx: number;
  rise: number;
  rot: number;
  delay: number;
  dur: number;
  color: string;
  round: boolean;
  size: number;
};

function makePieces(n: number): Piece[] {
  return Array.from({ length: n }, () => {
    const spread = (Math.random() - 0.5) * 2; // -1..1
    return {
      dx: spread * (120 + Math.random() * 160),
      rise: 70 + Math.random() * 150,
      rot: (Math.random() - 0.5) * 720,
      delay: Math.random() * 0.12,
      dur: 0.9 + Math.random() * 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() > 0.5,
      size: 7 + Math.random() * 7,
    };
  });
}

export function Confetti({ pieces = 40 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const [alive, setAlive] = useState(true);
  const [items] = useState(() => makePieces(pieces));

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), 1600);
    return () => clearTimeout(t);
  }, []);

  if (reduce || !alive) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-[22%]">
        {items.map((p, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              borderRadius: p.round ? "9999px" : "2px",
              background: p.color,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: [0, p.dx * 0.6, p.dx],
              y: [0, -p.rise, p.rise + 320],
              rotate: [0, p.rot],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: p.dur, delay: p.delay, ease: [0.22, 0.6, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
