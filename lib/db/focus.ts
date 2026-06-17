import "server-only";

/**
 * Focus Feature data layer.
 *
 * Reads the student's current road state (via getStudentRoad — no extra DB
 * round-trip beyond what mastery already needs) and assembles the three
 * focus-screen sections:
 *
 *   prescription — today's actionable quest (= the frontier prescription)
 *   frontier     — this week's progress visual (gate + strong/required)
 *   revisit      — the top-priority cleared-but-decayed gate, if any
 *
 * Nothing here is stored; it is derived fresh on each page load. The
 * student_focus table (migration 0017) is a cache for future optimisation.
 * Privacy is enforced at the RLS layer, not here.
 */

import { getStudentRoad, type Prescription } from "./mastery";
import type { Subject } from "@/lib/types";
import type { Gate, Frontier } from "@/lib/mastery";

export type Revisit = {
  subject: Subject;
  chapter: string;
  gate: Gate;
  gateLabel: string;
};

export type FocusData = {
  /** The actionable prescription for today (8 questions at the frontier gate). */
  prescription: Prescription | null;
  /** Frontier progress visual (strong / required counts + reason). */
  frontier: Frontier | null;
  /** Most-decayed cleared gate to gently surface for revisiting. Null when none. */
  revisit: Revisit | null;
};

export async function getStudentFocus(studentId: string): Promise<FocusData> {
  const { road, prescription } = await getStudentRoad(studentId);

  const top = road.reinforcements[0] ?? null;
  const revisit: Revisit | null = top
    ? {
        subject: top.subject,
        chapter: top.chapter,
        gate: top.gate,
        gateLabel: top.gateLabel,
      }
    : null;

  return { prescription, frontier: road.frontier, revisit };
}
