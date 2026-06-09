"use client";

/**
 * Mock builder (admin). Pick questions from the centre's bank into an ordered
 * paper, balance it by subject, assign a batch, then Save draft / Publish.
 *
 * Presentation + selection only — the server action re-validates everything
 * (centre ownership, batch, publish requirements) before writing.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  X,
} from "lucide-react";
import { SUBJECTS, DIFFICULTIES } from "@/lib/questions/validate";
import type { PickerQuestion, MockStatus } from "@/lib/db/mocks";
import { saveMockAction } from "@/app/admin/mocks/actions";

const SUBJECT_PILL: Record<string, string> = {
  Physics: "bg-sky-50 text-sky-700",
  Chemistry: "bg-violet-50 text-violet-700",
  Biology: "bg-teal-50 text-teal-700",
};
const DIFFICULTY_PILL: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard: "bg-rose-50 text-rose-700",
};
const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30";

export function MockBuilder({
  questions,
  batches,
  chapters,
  initial,
}: {
  questions: PickerQuestion[];
  batches: { id: string; name: string }[];
  chapters: string[];
  initial?: {
    id: string;
    title: string;
    batchId: string | null;
    questionIds: string[];
    maxAttempts: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [batchId, setBatchId] = useState(initial?.batchId ?? "");
  const [maxAttempts, setMaxAttempts] = useState(initial?.maxAttempts ?? 1);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.questionIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const [fSubject, setFSubject] = useState("");
  const [fDifficulty, setFDifficulty] = useState("");
  const [fChapter, setFChapter] = useState("");
  const [q, setQ] = useState("");

  const byId = useMemo(() => new Map(questions.map((x) => [x.id, x])), [questions]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return questions.filter((x) => {
      if (fSubject && x.subject !== fSubject) return false;
      if (fDifficulty && x.difficulty !== fDifficulty) return false;
      if (fChapter && x.chapter !== fChapter) return false;
      if (needle && !x.text.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [questions, fSubject, fDifficulty, fChapter, q]);

  const selectedQuestions = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((x): x is PickerQuestion => !!x),
    [selectedIds, byId],
  );

  const breakdown = useMemo(() => {
    return SUBJECTS.map((s) => ({
      subject: s,
      count: selectedQuestions.filter((x) => x.subject === s).length,
    }));
  }, [selectedQuestions]);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const removeId = (id: string) =>
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  const move = (index: number, dir: -1 | 1) =>
    setSelectedIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const save = (status: MockStatus) => {
    setError(null);
    if (!title.trim()) {
      setError("Give the mock a title.");
      return;
    }
    if (status === "published") {
      if (!batchId) {
        setError("Assign a batch before publishing.");
        return;
      }
      if (selectedIds.length === 0) {
        setError("Add at least one question before publishing.");
        return;
      }
    }
    startTransition(async () => {
      const res = await saveMockAction({
        id: initial?.id,
        title: title.trim(),
        batchId: batchId || null,
        questionIds: selectedIds,
        status,
        maxAttempts,
      });
      if (res.ok) router.push("/admin/mocks");
      else setError(res.error ?? "Couldn't save the mock.");
    });
  };

  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="card space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink/60">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekend NEET Mock — Set 2"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink/60">
            Assign to batch{" "}
            <span className="font-normal text-ink/40">(required to publish)</span>
          </label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
            <option value="">No batch yet</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink/60">
            Student attempts allowed
          </label>
          <select
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value))}
            className={inputCls}
          >
            <option value={1}>1 attempt (no retake)</option>
            <option value={2}>2 attempts (allow one retake)</option>
            <option value={3}>3 attempts</option>
          </select>
          <p className="mt-1 text-[11px] text-ink/45">
            Students can submit this mock up to this many times. You can change it later.
          </p>
        </div>
      </div>

      {/* Selected panel */}
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-semibold text-ink">
            Selected ({selectedIds.length})
          </h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {breakdown.map((b) => (
              <span key={b.subject} className={`pill ${SUBJECT_PILL[b.subject]}`}>
                {b.subject} {b.count}
              </span>
            ))}
          </div>
        </div>

        {selectedQuestions.length === 0 ? (
          <p className="rounded-lg bg-black/[0.02] px-3 py-4 text-center text-sm text-ink/50">
            No questions yet — add them from the bank below.
          </p>
        ) : (
          <ol className="space-y-2">
            {selectedQuestions.map((x, i) => (
              <li
                key={x.id}
                className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2"
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-ink/40">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className={`pill ${SUBJECT_PILL[x.subject]}`}>{x.subject}</span>
                    <span className={`pill ${DIFFICULTY_PILL[x.difficulty]}`}>
                      {x.difficulty}
                    </span>
                  </div>
                  <p className="truncate text-sm text-ink">{x.text}</p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="grid h-7 w-7 place-items-center rounded-lg text-ink/50 hover:bg-black/[0.04] disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === selectedQuestions.length - 1}
                    aria-label="Move down"
                    className="grid h-7 w-7 place-items-center rounded-lg text-ink/50 hover:bg-black/[0.04] disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeId(x.id)}
                    aria-label="Remove"
                    className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Bank picker */}
      <div className="card p-5">
        <h2 className="mb-3 font-display font-semibold text-ink">Question bank</h2>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className={`${inputCls} pl-8`}
            />
          </div>
          <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className={inputCls}>
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={fDifficulty}
            onChange={(e) => setFDifficulty(e.target.value)}
            className={inputCls}
          >
            <option value="">Any level</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={fChapter} onChange={(e) => setFChapter(e.target.value)} className={inputCls}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {questions.length === 0 ? (
          <p className="rounded-lg bg-black/[0.02] px-3 py-4 text-center text-sm text-ink/50">
            Your bank is empty. Add questions first in the Question Bank.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {filtered.map((x) => {
              const on = selectedSet.has(x.id);
              return (
                <button
                  key={x.id}
                  onClick={() => toggle(x.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    on
                      ? "border-teal bg-teal/[0.06]"
                      : "border-black/[0.06] bg-white hover:bg-black/[0.02]"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      on ? "bg-teal text-white" : "bg-black/[0.04] text-ink/40"
                    }`}
                  >
                    {on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={`pill ${SUBJECT_PILL[x.subject]}`}>{x.subject}</span>
                      <span className={`pill ${DIFFICULTY_PILL[x.difficulty]}`}>
                        {x.difficulty}
                      </span>
                      <span className="text-[11px] text-ink/45">
                        {x.chapter} · {x.concept}
                      </span>
                    </div>
                    <p className="truncate text-sm text-ink">{x.text}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-ink/50">
                No questions match these filters.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Save bar */}
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => save("draft")}
          disabled={pending}
          className="btn-ghost flex-1 text-sm"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save draft
        </button>
        <button
          onClick={() => save("published")}
          disabled={pending}
          className="btn-primary flex-1 text-sm"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Publish
        </button>
      </div>
      <p className="text-center text-[11px] text-ink/45">
        Publishing makes this mock visible to the assigned batch&apos;s students.
      </p>
    </div>
  );
}
