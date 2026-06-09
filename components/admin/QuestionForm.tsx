"use client";

/**
 * Add / edit a single question (admin). The fields mirror the CSV columns so
 * both entry paths share the same server-side validation. Tags (chapter,
 * concept, difficulty) are emphasised because they power the diagnosis engine.
 */

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus, Save } from "lucide-react";
import {
  createQuestionAction,
  updateQuestionAction,
  type QuestionFormState,
} from "@/app/admin/questions/actions";
import { DIFFICULTIES, SUBJECTS, indexToLetter } from "@/lib/questions/validate";
import type { BankQuestion } from "@/lib/db/questions";

const initial: QuestionFormState = { error: null, ok: false };

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30";
const labelCls = "mb-1 block text-xs font-semibold text-ink/60";

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>
          Saving <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : mode === "create" ? (
        <>
          Add question <Plus className="h-4 w-4" />
        </>
      ) : (
        <>
          Save changes <Save className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export function QuestionForm({
  mode,
  question,
}: {
  mode: "create" | "edit";
  question?: BankQuestion;
}) {
  const action = mode === "create" ? createQuestionAction : updateQuestionAction;
  const [state, formAction] = useFormState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs after a successful create (edit redirects away).
  useEffect(() => {
    if (mode === "create" && state.ok) formRef.current?.reset();
  }, [mode, state.ok]);

  const opt = question?.options ?? [];

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {mode === "edit" && question && (
        <input type="hidden" name="id" value={question.id} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Subject</label>
          <select
            name="subject"
            required
            defaultValue={question?.subject ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Select…
            </option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Difficulty</label>
          <select
            name="difficulty"
            required
            defaultValue={question?.difficulty ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Select…
            </option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Chapter</label>
          <input
            name="chapter"
            required
            defaultValue={question?.chapter ?? ""}
            placeholder="e.g. Ray Optics"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Concept</label>
          <input
            name="concept"
            required
            defaultValue={question?.concept ?? ""}
            placeholder="e.g. Concave mirror images"
            className={inputCls}
          />
        </div>
      </div>

      <p className="rounded-lg bg-teal/5 px-3 py-2 text-[11px] leading-relaxed text-teal-deep">
        Chapter, concept &amp; difficulty tags drive the diagnosis — keep them
        accurate so the report can pinpoint exactly what to re-teach.
      </p>

      <div>
        <label className={labelCls}>Par time (seconds)</label>
        <input
          name="par_time_sec"
          type="number"
          min={1}
          required
          defaultValue={question?.parTimeSec ?? 60}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Question text</label>
        <textarea
          name="question_text"
          required
          rows={3}
          defaultValue={question?.text ?? ""}
          placeholder="Type the question…"
          className={inputCls}
        />
      </div>

      <div className="grid gap-2">
        <label className={labelCls}>Options (mark the correct one below)</label>
        {(["a", "b", "c", "d"] as const).map((letter, i) => (
          <div key={letter} className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-sm font-bold text-ink/60">
              {letter.toUpperCase()}
            </span>
            <input
              name={`option_${letter}`}
              required
              defaultValue={opt[i] ?? ""}
              placeholder={`Option ${letter.toUpperCase()}`}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      <div>
        <label className={labelCls}>Correct option</label>
        <select
          name="correct_option"
          required
          defaultValue={question ? indexToLetter(question.answerIndex) : "A"}
          className={inputCls}
        >
          {["A", "B", "C", "D"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}
      {mode === "create" && state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Question added to your bank.
        </p>
      )}

      <SubmitButton mode={mode} />
    </form>
  );
}
