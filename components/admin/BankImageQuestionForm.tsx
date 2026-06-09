"use client";

/**
 * Add a diagram/image GLOBAL question (platform admin) — dark themed.
 * Upload a figure (e.g. cropped from the extractor's page PNG), optionally type
 * a stem and option texts, and pick the correct option. Leave option texts blank
 * for "the options are in the image" questions — students just pick A/B/C/D.
 */

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  createGlobalImageQuestionAction,
  type QuestionFormState,
} from "@/app/admin/bank/actions";
import { DIFFICULTIES, SUBJECTS } from "@/lib/questions/validate";

const initial: QuestionFormState = { error: null, ok: false };
const labelCls = "mb-1 block text-xs font-semibold text-paper/60";
const selDark = "field-dark [&>option]:bg-[#0c2b24] [&>option]:text-paper";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>Uploading <Loader2 className="h-4 w-4 animate-spin" /></>
      ) : (
        <>Add diagram question <ImagePlus className="h-4 w-4" /></>
      )}
    </button>
  );
}

export function BankImageQuestionForm() {
  const [state, formAction] = useFormState(createGlobalImageQuestionAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className={labelCls}>Figure image (PNG/JPG, max 5 MB)</label>
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="block w-full text-sm text-paper/70 file:mr-3 file:rounded-lg file:border-0 file:bg-energy file:px-3 file:py-2 file:text-sm file:font-bold file:text-focusink hover:file:bg-energy/90"
        />
        <p className="mt-1 text-[11px] text-paper/45">
          Crop it from the extractor&apos;s page PNG (docs/&lt;paper&gt;-pages/).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Subject</label>
          <select name="subject" required defaultValue="" className={selDark}>
            <option value="" disabled>Select…</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Difficulty</label>
          <select name="difficulty" required defaultValue="" className={selDark}>
            <option value="" disabled>Select…</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Chapter / Lesson</label>
          <input name="chapter" required placeholder="e.g. Ray Optics" className="field-dark" />
        </div>
        <div>
          <label className={labelCls}>Par time (seconds)</label>
          <input name="par_time_sec" type="number" min={1} required defaultValue={90} className="field-dark" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Question text (optional — leave blank if it&apos;s in the image)</label>
        <textarea name="question_text" rows={2} placeholder="Optional stem…" className="field-dark" />
      </div>

      <div className="grid gap-2">
        <label className={labelCls}>Option texts (optional — blank = options are in the image)</label>
        {(["a", "b", "c", "d"] as const).map((l) => (
          <div key={l} className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-sm font-bold text-paper/60">
              {l.toUpperCase()}
            </span>
            <input name={`option_${l}`} placeholder={`Option ${l.toUpperCase()} (optional)`} className="field-dark" />
          </div>
        ))}
      </div>

      <div>
        <label className={labelCls}>Correct option</label>
        <select name="correct_option" required defaultValue="A" className={selDark}>
          {["A", "B", "C", "D"].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {state.error && (
        <p className="rounded-lg bg-pop/15 px-3 py-2 text-sm font-medium text-[#FF9A91]">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-energy/15 px-3 py-2 text-sm font-medium text-energy">
          Diagram question added to the global bank.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
