"use client";

/**
 * Add / edit a single GLOBAL question (platform super-admin) — dark themed.
 * Mirrors QuestionForm but binds to the global bank actions (centre_id NULL).
 */

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus, Save } from "lucide-react";
import {
  createGlobalQuestionAction,
  updateGlobalQuestionAction,
  type QuestionFormState,
} from "@/app/admin/bank/actions";
import { DIFFICULTIES, SUBJECTS, indexToLetter } from "@/lib/questions/validate";
import type { BankQuestion } from "@/lib/db/globalQuestions";

const initial: QuestionFormState = { error: null, ok: false };

const labelCls = "mb-1 block text-xs font-semibold text-paper/60";

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

export function BankQuestionForm({
  mode,
  question,
}: {
  mode: "create" | "edit";
  question?: BankQuestion;
}) {
  const action =
    mode === "create" ? createGlobalQuestionAction : updateGlobalQuestionAction;
  const [state, formAction] = useFormState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

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
            className="field-dark [&>option]:bg-[#0c2b24] [&>option]:text-paper"
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
            className="field-dark [&>option]:bg-[#0c2b24] [&>option]:text-paper"
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
          <label className={labelCls}>Chapter / Lesson</label>
          <input
            name="chapter"
            required
            defaultValue={question?.chapter ?? ""}
            placeholder="e.g. Ray Optics"
            className="field-dark"
          />
        </div>
        <div>
          <label className={labelCls}>Concept</label>
          <input
            name="concept"
            required
            defaultValue={question?.concept ?? ""}
            placeholder="e.g. Concave mirror images"
            className="field-dark"
          />
        </div>
      </div>

      <p className="rounded-lg bg-energy/[0.08] px-3 py-2 text-[11px] leading-relaxed text-energy">
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
          className="field-dark"
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
          className="field-dark"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelCls}>Options (mark the correct one below)</label>
        {(["a", "b", "c", "d"] as const).map((letter, i) => (
          <div key={letter} className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-sm font-bold text-paper/60">
              {letter.toUpperCase()}
            </span>
            <input
              name={`option_${letter}`}
              required
              defaultValue={opt[i] ?? ""}
              placeholder={`Option ${letter.toUpperCase()}`}
              className="field-dark"
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
          className="field-dark [&>option]:bg-[#0c2b24] [&>option]:text-paper"
        >
          {["A", "B", "C", "D"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p className="rounded-lg bg-pop/15 px-3 py-2 text-sm font-medium text-[#FF9A91]">
          {state.error}
        </p>
      )}
      {mode === "create" && state.ok && (
        <p className="rounded-lg bg-energy/15 px-3 py-2 text-sm font-medium text-energy">
          Question added to the global bank.
        </p>
      )}

      <SubmitButton mode={mode} />
    </form>
  );
}
