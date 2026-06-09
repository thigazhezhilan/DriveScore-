/**
 * Static Tailwind class maps for each diagnosis category.
 *
 * Tailwind only sees classes that appear literally in source, so we can't
 * build them from a runtime colour token. This module is the single place
 * that maps a category -> its concrete utility classes.
 */

import type { DiagnosisCategory } from "@/lib/types";

type CategoryStyle = {
  /** Solid accent text colour. */
  text: string;
  /** Tinted background chip. */
  chipBg: string;
  /** Tinted text on the chip. */
  chipText: string;
  /** Left accent border for cards. */
  border: string;
  /** Soft section background. */
  softBg: string;
  /** Dot / icon background. */
  dot: string;
};

export const CATEGORY_STYLES: Record<DiagnosisCategory, CategoryStyle> = {
  CONCEPT_GAP: {
    text: "text-rose-600",
    chipBg: "bg-rose-50",
    chipText: "text-rose-700",
    border: "border-l-rose-500",
    softBg: "bg-rose-50/60",
    dot: "bg-rose-500",
  },
  GUESS: {
    text: "text-fuchsia-600",
    chipBg: "bg-fuchsia-50",
    chipText: "text-fuchsia-700",
    border: "border-l-fuchsia-500",
    softBg: "bg-fuchsia-50/60",
    dot: "bg-fuchsia-500",
  },
  CARELESS: {
    text: "text-amber-600",
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    border: "border-l-amber-500",
    softBg: "bg-amber-50/60",
    dot: "bg-amber-500",
  },
  TOO_SLOW: {
    text: "text-indigo-600",
    chipBg: "bg-indigo-50",
    chipText: "text-indigo-700",
    border: "border-l-indigo-500",
    softBg: "bg-indigo-50/60",
    dot: "bg-indigo-500",
  },
  TIME_MANAGEMENT: {
    text: "text-slate-600",
    chipBg: "bg-slate-100",
    chipText: "text-slate-700",
    border: "border-l-slate-400",
    softBg: "bg-slate-50",
    dot: "bg-slate-400",
  },
  SOLID: {
    text: "text-emerald-600",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    border: "border-l-emerald-500",
    softBg: "bg-emerald-50/60",
    dot: "bg-emerald-500",
  },
};

/** Difficulty chip styling. */
export const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard: "bg-rose-50 text-rose-700",
};

/** Subject chip styling. */
export const SUBJECT_STYLES: Record<string, string> = {
  Physics: "bg-sky-50 text-sky-700",
  Chemistry: "bg-violet-50 text-violet-700",
  Biology: "bg-teal-50 text-teal-700",
};
