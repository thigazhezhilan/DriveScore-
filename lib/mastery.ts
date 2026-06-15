/**
 * The Mastery Road engine — DriveScore's chapter-by-chapter progression map.
 *
 * Pure, deterministic logic over the raw answer history we already collect
 * (per-question difficulty + correctness + which session + when). No AI, no DB,
 * no React — kept dependency-free and isolated so it stays unit-testable, like
 * `diagnose.ts` and `rating.ts`.
 *
 * It is a VISUALISATION + PROGRESSION layer on top of existing data. It does
 * NOT predict NEET scores, seat cutoffs, or any "% to becoming a doctor" — it
 * only ever talks about the next reachable step.
 *
 * Each chapter has four difficulty GATES that unlock in order:
 *
 *   FOUNDATION  →  APPLICATION  →  NEET_LEVEL  →  HARD
 *
 * A gate is "earned twice, not once": one lucky correct answer can never clear
 * it. Clearing requires enough STRONG (correct) answers, spread across separate
 * sessions, at an accuracy threshold. A cleared gate can also move BACKWARD to
 * NEEDS_REINFORCEMENT when recent accuracy decays.
 */

import type { Difficulty, Subject } from "./types";
import { chapterRank } from "./questions/chapters";

// ── The gates ────────────────────────────────────────────────────────────────

export type Gate = "FOUNDATION" | "APPLICATION" | "NEET_LEVEL" | "HARD";

export type GateStatus =
  | "LOCKED" // a previous gate isn't cleared yet
  | "IN_PROGRESS" // unlocked, not yet earned
  | "CLEARED" // earned twice over
  | "NEEDS_REINFORCEMENT"; // was cleared, but recent accuracy has decayed

export const GATE_ORDER: Gate[] = [
  "FOUNDATION",
  "APPLICATION",
  "NEET_LEVEL",
  "HARD",
];

// ── Tunable config (all defaults live here, in ONE place) ─────────────────────

/** Strong (correct) answers needed to clear a gate. */
export const STRONG_ANSWERS_TO_CLEAR = 4;
/** A gate can't be unlocked inside a single session — needs this many. */
export const MIN_SESSIONS_TO_CLEAR = 2;
/** Overall accuracy at the tier required to clear (fraction 0–1). */
export const CLEAR_ACCURACY = 0.7;
/** Recent accuracy below this on a CLEARED gate drops it to NEEDS_REINFORCEMENT. */
export const REGRESSION_ACCURACY = 0.55;
/** How many of the most-recent answers at a tier define "recent". */
export const REGRESSION_RECENT_WINDOW = 6;
/** Need at least this many recent answers before regression can trigger (noise floor). */
export const REGRESSION_MIN_RECENT = 3;
/** Size of the recommended question set for the frontier prescription. */
export const PRESCRIPTION_SIZE = 8;

/**
 * Per-gate definition. The difficulty→gate mapping lives ONLY here, so it's
 * tunable in one place. We have three stored difficulties (Easy/Medium/Hard)
 * but four gates: the top two both draw from Hard questions and are separated
 * by CONSISTENCY — NEET_LEVEL = "can do hard questions", HARD = "dominates
 * them" (a stricter accuracy bar + more strong answers).
 */
export type GateConfig = {
  label: string;
  blurb: string;
  /** Question difficulties that count toward (and are prescribed for) this gate. */
  difficulties: Difficulty[];
  /** Strong answers needed (defaults to the global constant). */
  requiredStrong: number;
  /** Distinct sessions needed (defaults to the global constant). */
  minSessions: number;
  /** Accuracy needed to clear (defaults to the global constant). */
  clearAccuracy: number;
};

export const GATE_CONFIG: Record<Gate, GateConfig> = {
  FOUNDATION: {
    label: "Foundation",
    blurb: "The basics — definitions and direct, single-step questions.",
    difficulties: ["Easy"],
    requiredStrong: STRONG_ANSWERS_TO_CLEAR,
    minSessions: MIN_SESSIONS_TO_CLEAR,
    clearAccuracy: CLEAR_ACCURACY,
  },
  APPLICATION: {
    label: "Application",
    blurb: "Applying concepts to typical multi-step problems.",
    difficulties: ["Medium"],
    requiredStrong: STRONG_ANSWERS_TO_CLEAR,
    minSessions: MIN_SESSIONS_TO_CLEAR,
    clearAccuracy: CLEAR_ACCURACY,
  },
  NEET_LEVEL: {
    label: "NEET-level",
    blurb: "Exam-grade questions at real NEET difficulty.",
    difficulties: ["Hard"],
    requiredStrong: STRONG_ANSWERS_TO_CLEAR,
    minSessions: MIN_SESSIONS_TO_CLEAR,
    clearAccuracy: CLEAR_ACCURACY,
  },
  HARD: {
    label: "Mastery",
    blurb: "Dominating the toughest questions, consistently.",
    difficulties: ["Hard"],
    // The top gate is earned through reliability: a stricter bar than NEET-level.
    requiredStrong: 6,
    minSessions: MIN_SESSIONS_TO_CLEAR,
    clearAccuracy: 0.85,
  },
};

/** Which gates a given question difficulty feeds (a Hard answer feeds two). */
export function gatesForDifficulty(difficulty: Difficulty): Gate[] {
  return GATE_ORDER.filter((g) =>
    GATE_CONFIG[g].difficulties.includes(difficulty),
  );
}

// ── Engine input ─────────────────────────────────────────────────────────────

/** One answered question, reduced to just what the mastery engine needs. */
export type MasteryAnswer = {
  difficulty: Difficulty;
  correct: boolean;
  /** The attempt/session this answer belongs to (for the 2-session rule). */
  sessionId: string;
  /** Submission time in epoch ms (for recency/regression). */
  at: number;
};

// ── Per-gate + per-chapter state ─────────────────────────────────────────────

export type GateState = {
  gate: Gate;
  status: GateStatus;
  /** Correct answers at this tier ("strong answers"). */
  strong: number;
  /** Strong answers needed to clear. */
  required: number;
  /** Total answered at this tier. */
  attempts: number;
  /** Distinct sessions touched at this tier. */
  sessions: number;
  /** Overall accuracy at this tier (fraction 0–1). */
  accuracy: number;
  /** Progress toward clearing, 0–100 (capped). */
  progressPct: number;
};

export type ChapterMastery = {
  subject: Subject;
  chapter: string;
  gates: GateState[];
  /** Index into GATE_ORDER of the highest CLEARED gate, or -1. */
  highestClearedIndex: number;
  /** The gate to work on next within this chapter (unlocked + not cleared), or null. */
  activeGate: GateState | null;
  /** A cleared-but-decayed gate to revisit, if any. */
  reinforcement: GateState | null;
  /** True once the student has answered anything in this chapter. */
  touched: boolean;
};

/** Compute the recent accuracy at a tier from the most-recent answers. */
function recentAccuracy(relevant: MasteryAnswer[]): { acc: number; n: number } {
  const recent = [...relevant]
    .sort((a, b) => b.at - a.at)
    .slice(0, REGRESSION_RECENT_WINDOW);
  if (recent.length === 0) return { acc: 0, n: 0 };
  const correct = recent.filter((a) => a.correct).length;
  return { acc: correct / recent.length, n: recent.length };
}

/**
 * Compute the four gate states for one chapter. Pure + deterministic.
 *
 * Gates unlock strictly in order: a gate is only reachable once the previous
 * gate has been earned. Regression overlays on top — a cleared gate whose
 * RECENT accuracy has fallen is surfaced as NEEDS_REINFORCEMENT (so its
 * chapter standing drops, i.e. the map moves backward).
 */
export function computeChapterMastery(
  subject: Subject,
  chapter: string,
  answers: MasteryAnswer[],
): ChapterMastery {
  // First pass: did each gate meet the raw "earned twice" bar?
  const earned: Record<Gate, boolean> = {
    FOUNDATION: false,
    APPLICATION: false,
    NEET_LEVEL: false,
    HARD: false,
  };
  const raw: Record<Gate, { strong: number; attempts: number; sessions: number; accuracy: number; decayed: boolean }> =
    {} as never;

  for (const gate of GATE_ORDER) {
    const cfg = GATE_CONFIG[gate];
    const relevant = answers.filter((a) => cfg.difficulties.includes(a.difficulty));
    const attempts = relevant.length;
    const strong = relevant.filter((a) => a.correct).length;
    const sessions = new Set(relevant.map((a) => a.sessionId)).size;
    const accuracy = attempts > 0 ? strong / attempts : 0;
    const meetsClear =
      strong >= cfg.requiredStrong &&
      sessions >= cfg.minSessions &&
      accuracy >= cfg.clearAccuracy;

    // Regression: only meaningful once a gate has been cleared.
    let decayed = false;
    if (meetsClear) {
      const { acc, n } = recentAccuracy(relevant);
      decayed = n >= REGRESSION_MIN_RECENT && acc < REGRESSION_ACCURACY;
    }

    earned[gate] = meetsClear;
    raw[gate] = { strong, attempts, sessions, accuracy, decayed };
  }

  // Second pass: assign statuses with ordered unlocking + regression overlay.
  // A gate only counts as unlocked once the PREVIOUS gate has been earned, so a
  // gate can never be CLEARED ahead of its prerequisite (you can't skip Easy and
  // "clear" Medium). Unlocking chains on ever-earned, so a later decay of a
  // lower gate surfaces a reinforcement prompt without harshly re-locking the
  // higher gates the student has clearly already mastered.
  const gates: GateState[] = GATE_ORDER.map((gate, i) => {
    const cfg = GATE_CONFIG[gate];
    const r = raw[gate];
    const unlocked = i === 0 || earned[GATE_ORDER[i - 1]];

    let status: GateStatus;
    if (!unlocked) {
      status = "LOCKED";
    } else if (earned[gate]) {
      status = r.decayed ? "NEEDS_REINFORCEMENT" : "CLEARED";
    } else {
      status = "IN_PROGRESS";
    }

    return {
      gate,
      status,
      strong: r.strong,
      required: cfg.requiredStrong,
      attempts: r.attempts,
      sessions: r.sessions,
      accuracy: r.accuracy,
      progressPct: Math.round(
        Math.min(r.strong / cfg.requiredStrong, 1) * 100,
      ),
    };
  });

  // Standing: highest gate currently CLEARED (a decayed gate doesn't count, so
  // regression visibly drops the standing — the map goes backward).
  let highestClearedIndex = -1;
  gates.forEach((g, i) => {
    if (g.status === "CLEARED") highestClearedIndex = i;
  });

  const activeGate =
    gates.find((g) => g.status === "IN_PROGRESS") ?? null;
  const reinforcement =
    gates.find((g) => g.status === "NEEDS_REINFORCEMENT") ?? null;
  const touched = answers.length > 0;

  return {
    subject,
    chapter,
    gates,
    highestClearedIndex,
    activeGate,
    reinforcement,
    touched,
  };
}

// ── The road (across all chapters) ───────────────────────────────────────────

/** Raw per-chapter answers handed to the engine. */
export type ChapterAnswers = {
  subject: Subject;
  chapter: string;
  answers: MasteryAnswer[];
};

/** The single next quest: the gate closest to clearing across all chapters. */
export type Frontier = {
  subject: Subject;
  chapter: string;
  gate: Gate;
  gateLabel: string;
  strong: number;
  required: number;
  /** Plain-language, next-step reason (never a global percentage). */
  reason: string;
};

export type SubjectRoad = {
  subject: Subject;
  chapters: ChapterMastery[];
};

export type Road = {
  subjects: SubjectRoad[];
  /** The one quest to highlight, or null only when there is literally no syllabus. */
  frontier: Frontier | null;
  /** Cleared-but-decayed gates to gently surface for revisiting. */
  reinforcements: { subject: Subject; chapter: string; gate: Gate; gateLabel: string }[];
};

const SUBJECT_ORDER: Subject[] = ["Physics", "Chemistry", "Biology"];

/** Stable sort key so frontier ties + display order are deterministic. */
function chapterSortKey(c: { subject: Subject; chapter: string }): number {
  return SUBJECT_ORDER.indexOf(c.subject) * 1000 + chapterRank(c.subject, c.chapter);
}

/** A one-line, encouraging reason for a frontier gate. */
export function frontierReason(gate: Gate, chapter: string): string {
  switch (gate) {
    case "FOUNDATION":
      return `Build your base in ${chapter} — nail the fundamentals first.`;
    case "APPLICATION":
      return `You've got the basics in ${chapter}. Time to apply them.`;
    case "NEET_LEVEL":
      return `Strong application in ${chapter} — step up to real NEET-level questions.`;
    case "HARD":
      return `You're NEET-ready in ${chapter}. Master the toughest questions to lock it in.`;
  }
}

/**
 * Build the full road from per-chapter answers.
 *
 * Frontier rule: the SINGLE gate with the most progress toward clearing among
 * chapters the student has actually touched. In-progress gates are preferred;
 * if none are in progress (e.g. everything cleared, or only decayed gates
 * remain), a gate needing reinforcement is chosen; if there's no history at
 * all, we fall back to the Foundation of the first syllabus chapter so a
 * brand-new student always has a reachable first quest.
 */
export function computeRoad(chapters: ChapterAnswers[]): Road {
  const masteries = chapters.map((c) =>
    computeChapterMastery(c.subject, c.chapter, c.answers),
  );

  // Group into subjects, each chapter list in NCERT order.
  const subjects: SubjectRoad[] = SUBJECT_ORDER.map((subject) => ({
    subject,
    chapters: masteries
      .filter((m) => m.subject === subject)
      .sort((a, b) => chapterRank(subject, a.chapter) - chapterRank(subject, b.chapter)),
  })).filter((s) => s.chapters.length > 0);

  // Reinforcements to surface.
  const reinforcements = masteries
    .filter((m) => m.reinforcement)
    .sort((a, b) => chapterSortKey(a) - chapterSortKey(b))
    .map((m) => ({
      subject: m.subject,
      chapter: m.chapter,
      gate: m.reinforcement!.gate,
      gateLabel: GATE_CONFIG[m.reinforcement!.gate].label,
    }));

  // Frontier candidates, in a deterministic order.
  const touched = masteries
    .filter((m) => m.touched)
    .sort((a, b) => chapterSortKey(a) - chapterSortKey(b));

  const pickBy = (
    list: ChapterMastery[],
    select: (m: ChapterMastery) => GateState | null,
  ): { m: ChapterMastery; g: GateState } | null => {
    let best: { m: ChapterMastery; g: GateState } | null = null;
    for (const m of list) {
      const g = select(m);
      if (!g) continue;
      const ratio = g.strong / g.required;
      const bestRatio = best ? best.g.strong / best.g.required : -1;
      if (ratio > bestRatio) best = { m, g };
    }
    return best;
  };

  // 1) closest in-progress gate; 2) else a decayed gate to recover; 3) fallback.
  const chosen =
    pickBy(touched, (m) => m.activeGate) ??
    pickBy(touched, (m) => m.reinforcement);

  let frontier: Frontier | null = null;
  if (chosen) {
    frontier = {
      subject: chosen.m.subject,
      chapter: chosen.m.chapter,
      gate: chosen.g.gate,
      gateLabel: GATE_CONFIG[chosen.g.gate].label,
      strong: chosen.g.strong,
      required: chosen.g.required,
      reason: frontierReason(chosen.g.gate, chosen.m.chapter),
    };
  } else {
    // No usable history anywhere — point at the first syllabus chapter so a new
    // student still has a reachable first quest.
    const first = [...masteries].sort((a, b) => chapterSortKey(a) - chapterSortKey(b))[0];
    if (first) {
      frontier = {
        subject: first.subject,
        chapter: first.chapter,
        gate: "FOUNDATION",
        gateLabel: GATE_CONFIG.FOUNDATION.label,
        strong: 0,
        required: GATE_CONFIG.FOUNDATION.requiredStrong,
        reason: frontierReason("FOUNDATION", first.chapter),
      };
    }
  }

  return { subjects, frontier, reinforcements };
}
