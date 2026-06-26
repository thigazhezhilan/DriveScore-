"use client";

import { useFormState, useFormStatus } from "react-dom";
import { selectFirstLanguage, type SelectLanguageState } from "./actions";
import { Languages, Loader2, Lock } from "lucide-react";

const INITIAL: SelectLanguageState = { error: null };

function ChooseButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <span className="mt-4 inline-block rounded-lg bg-energy/15 px-3 py-1.5 text-xs font-semibold text-energy transition group-hover:bg-energy group-hover:text-focusink">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
    </span>
  );
}

export function LanguageSelectClient({ role }: { role: string }) {
  const [state, formAction] = useFormState(selectFirstLanguage, INITIAL);

  return (
    <main className="student-skin flex min-h-dvh flex-col items-center justify-center bg-focusink px-5 py-12">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-energy/15 text-energy">
          <Languages className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-paper">
          Choose your language
          <span className="mx-2 text-energy">/</span>
          உங்கள் மொழியை தேர்வு செய்யுங்கள்
        </h1>
        <p className="max-w-sm text-sm text-paper/60">
          This choice is permanent and cannot be changed later — all questions
          and the app interface will be in the language you pick.
        </p>
        <p className="max-w-sm font-tamil text-sm text-paper/60">
          இந்த தேர்வை பின்னர் மாற்ற முடியாது — நீங்கள் தேர்வு செய்த மொழியில்
          தேர்வுகளும் செயலியும் இயங்கும்.
        </p>
      </div>

      {/* Lock notice */}
      <div className="mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-paper/50">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        Locked permanently once chosen · தேர்வு செய்தபின் நிரந்தரமாக பூட்டப்படும்
      </div>

      {/* Cards */}
      <div className="flex w-full max-w-sm flex-col gap-4">
        {/* English */}
        <form action={formAction}>
          <input type="hidden" name="locale" value="en" />
          <button
            type="submit"
            className="group w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-energy/60 hover:bg-energy/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <p className="font-display text-xl font-bold text-paper">English</p>
            <p className="mt-1 text-sm text-paper/55">
              All questions and the interface in English
            </p>
            <ChooseButton label="Choose English →" />
          </button>
        </form>

        {/* Tamil */}
        <form action={formAction}>
          <input type="hidden" name="locale" value="ta" />
          <button
            type="submit"
            className="group w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-energy/60 hover:bg-energy/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <p className="font-tamil font-display text-xl font-bold text-paper">
              தமிழ்
            </p>
            <p className="font-tamil mt-1 text-sm text-paper/55">
              கேள்விகளும் செயலியும் தமிழில்
            </p>
            <ChooseButton label="தமிழ் தேர்வு செய் →" />
          </button>
        </form>
      </div>

      {/* Error */}
      {state.error && (
        <p className="mt-6 rounded-xl bg-pop/15 px-4 py-3 text-sm text-[#FF9A91]">
          {state.error}
        </p>
      )}
    </main>
  );
}
