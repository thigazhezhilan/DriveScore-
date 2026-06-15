"use client";

/**
 * The Mastery Road — a game-like climb (presentation only).
 *
 * Mobile-first. Shows, per subject, each touched chapter's four gates, the ONE
 * frontier quest highlighted with its prescription, and gentle revisit prompts
 * for decayed gates. Movement + next-step only — never a global percentage.
 */

import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Lock, RotateCcw, Sparkles, Target } from "lucide-react";
import { Neuro } from "@/components/mascot/Neuro";
import {
  GATE_CONFIG,
  GATE_ORDER,
  type ChapterMastery,
  type Gate,
  type GateState,
  type GateStatus,
} from "@/lib/mastery";
import type { RoadData } from "@/lib/db/mastery";
import { startGateQuest } from "@/app/road/actions";
import { SUBJECT_STYLES } from "@/components/categoryStyles";

const STATUS_STYLE: Record<
  GateStatus,
  { track: string; fill: string; label: string; text: string }
> = {
  CLEARED: { track: "bg-emerald-100", fill: "bg-emerald-500", label: "Cleared", text: "text-emerald-700" },
  IN_PROGRESS: { track: "bg-slate-200", fill: "bg-energy", label: "In progress", text: "text-energy-deep" },
  NEEDS_REINFORCEMENT: { track: "bg-amber-100", fill: "bg-amber-500", label: "Revisit", text: "text-amber-700" },
  LOCKED: { track: "bg-slate-200/50", fill: "bg-slate-300", label: "Locked", text: "text-ink/35" },
};

function standingLabel(m: ChapterMastery): string {
  if (m.highestClearedIndex < 0) return m.touched ? "Building foundation" : "Not started";
  return `${GATE_CONFIG[GATE_ORDER[m.highestClearedIndex]].label} cleared`;
}

function captionFor(m: ChapterMastery): string {
  if (m.reinforcement) {
    return `Revisit ${GATE_CONFIG[m.reinforcement.gate].label} — recent answers slipped`;
  }
  if (m.activeGate) {
    const g = m.activeGate;
    return `${Math.min(g.strong, g.required)} of ${g.required} strong ${GATE_CONFIG[g.gate].label} answers`;
  }
  return "All gates cleared 🎉";
}

/** A single gate segment: a labelled bar coloured by status. */
function GatePip({ g }: { g: GateState }) {
  const s = STATUS_STYLE[g.status];
  const cfg = GATE_CONFIG[g.gate];
  const width =
    g.status === "CLEARED" || g.status === "NEEDS_REINFORCEMENT"
      ? 100
      : g.status === "IN_PROGRESS"
        ? Math.max(g.progressPct, 6)
        : 0;
  return (
    <div
      className="min-w-0 flex-1"
      title={`${cfg.label}: ${s.label}${g.attempts > 0 ? ` · ${g.strong}/${g.required} strong` : ""}`}
    >
      <div className={`relative h-2.5 overflow-hidden rounded-full ${s.track}`}>
        <div className={`h-full rounded-full ${s.fill}`} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-center gap-0.5">
        {g.status === "CLEARED" && <Check className="h-3 w-3 text-emerald-600" />}
        {g.status === "LOCKED" && <Lock className="h-2.5 w-2.5 text-ink/30" />}
        {g.status === "NEEDS_REINFORCEMENT" && <RotateCcw className="h-2.5 w-2.5 text-amber-600" />}
        <span className={`truncate text-[9px] font-semibold ${s.text}`}>{cfg.label}</span>
      </div>
    </div>
  );
}

function ChapterCard({
  m,
  isFrontier,
}: {
  m: ChapterMastery;
  isFrontier: boolean;
}) {
  return (
    <div className={`card p-4 ${isFrontier ? "ring-2 ring-energy" : ""}`}>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-ink">{m.chapter}</p>
          <p className="mt-0.5 text-[11px] font-medium text-ink/45">{standingLabel(m)}</p>
        </div>
        {isFrontier && (
          <span className="pill shrink-0 bg-energy/15 text-energy-deep">
            <Target className="h-3 w-3" /> Next quest
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        {m.gates.map((g) => (
          <GatePip key={g.gate} g={g} />
        ))}
      </div>
      <p className="mt-2.5 text-[11px] font-medium text-ink/55">{captionFor(m)}</p>
    </div>
  );
}

/** A hidden-input form that starts a gate quest via the server action. */
function QuestForm({
  subject,
  chapter,
  gate,
  children,
}: {
  subject: string;
  chapter: string;
  gate: Gate;
  children: React.ReactNode;
}) {
  return (
    <form action={startGateQuest}>
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="chapter" value={chapter} />
      <input type="hidden" name="gate" value={gate} />
      {children}
    </form>
  );
}

export function RoadClient({ data, error }: { data: RoadData; error?: string | null }) {
  const { road, prescription } = data;
  const frontier = road.frontier;
  const hasSyllabus = road.subjects.length > 0;

  return (
    <main className="student-skin mx-auto min-h-dvh max-w-2xl px-5 pb-16 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-energy-deep">
            Mastery Road
          </p>
          <h1 className="font-display text-2xl font-extrabold text-ink">Your climb</h1>
        </div>
        <Link href="/" className="btn-ghost px-3 py-2 text-xs" aria-label="Back to home">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          {error}
        </div>
      )}

      {/* Empty state — no graded attempts yet. */}
      {!hasSyllabus && (
        <div className="card-energy grid place-items-center gap-3 p-8 text-center">
          <Neuro mood="welcome" size={120} />
          <h2 className="font-display text-lg font-bold text-ink">
            Your road starts with one mock
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-ink/65">
            Take a practice test and your chapters will appear here as gates to
            conquer — Foundation first, all the way to Mastery.
          </p>
          <Link href="/practice" className="btn-energy mt-1">
            Start practising <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {hasSyllabus && (
        <>
          {/* The single frontier quest. */}
          {frontier && prescription && (
            <section className="card-energy relative mb-6 overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-energy-soft/40 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <Neuro mood="thinking" size={84} />
                <div className="min-w-0 flex-1">
                  <span className="pill bg-energy/15 text-energy-deep">
                    <Sparkles className="h-3.5 w-3.5" /> Your next quest
                  </span>
                  <h2 className="mt-2 font-display text-lg font-extrabold leading-tight text-ink">
                    {frontier.chapter}
                  </h2>
                  <p className="text-xs font-semibold text-ink/50">
                    {frontier.subject} · {prescription.gateLabel} gate
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">{frontier.reason}</p>
                  <p className="mt-2 text-xs font-semibold text-energy-deep">
                    {Math.min(frontier.strong, frontier.required)} of {frontier.required} strong
                    answers so far
                  </p>
                </div>
              </div>
              <QuestForm subject={frontier.subject} chapter={frontier.chapter} gate={frontier.gate}>
                <button type="submit" className="btn-energy mt-4 w-full">
                  Start {prescription.recommendedCount} {prescription.gateLabel} questions
                  <ChevronRight className="h-4 w-4" />
                </button>
              </QuestForm>
            </section>
          )}

          {/* Gentle revisit prompts for decayed gates. */}
          {road.reinforcements.length > 0 && (
            <section className="mb-6">
              <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-amber-700">
                <RotateCcw className="h-4 w-4" /> Worth revisiting
              </h3>
              <div className="grid gap-2">
                {road.reinforcements.map((r) => (
                  <div
                    key={`${r.subject}-${r.chapter}-${r.gate}`}
                    className="card flex items-center justify-between gap-3 border-l-4 border-l-amber-400 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{r.chapter}</p>
                      <p className="text-[11px] text-ink/50">
                        {r.subject} · {r.gateLabel} slipped recently
                      </p>
                    </div>
                    <QuestForm subject={r.subject} chapter={r.chapter} gate={r.gate}>
                      <button type="submit" className="btn-ghost shrink-0 px-3 py-2 text-xs">
                        Revisit <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </QuestForm>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Per-subject climbs. */}
          <div className="grid gap-7">
            {road.subjects.map((s) => (
              <section key={s.subject}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className={`pill ${SUBJECT_STYLES[s.subject]}`}>{s.subject}</span>
                  <span className="text-xs font-medium text-ink/40">
                    {s.chapters.length} {s.chapters.length === 1 ? "chapter" : "chapters"}
                  </span>
                </div>
                <div className="grid gap-2.5">
                  {s.chapters.map((m) => (
                    <ChapterCard
                      key={`${m.subject}-${m.chapter}`}
                      m={m}
                      isFrontier={
                        !!frontier &&
                        frontier.subject === m.subject &&
                        frontier.chapter === m.chapter
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
