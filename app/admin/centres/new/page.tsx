/**
 * Create a new coaching centre. Admin-only.
 */

"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Building2, Check, Loader2 } from "lucide-react";
import { createCentreAction, type CreateCentreState } from "@/app/admin/actions";

const initial: CreateCentreState = { error: null, created: null };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>Creating <Loader2 className="h-4 w-4 animate-spin" /></>
      ) : (
        <>Create centre <Building2 className="h-4 w-4" /></>
      )}
    </button>
  );
}

export default function NewCentrePage() {
  const [state, formAction] = useFormState(createCentreAction, initial);

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-14 pt-6">
      <header className="animate-fade-up flex items-center gap-3">
        <Link
          href="/admin"
          className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white text-ink/70 transition hover:bg-black/[0.03]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            Platform Admin
          </p>
          <h1 className="font-display text-lg font-bold text-ink">Create a centre</h1>
        </div>
      </header>

      <section className="animate-fade-up mt-6">
        <div className="card p-5">
          <p className="mb-4 text-sm text-ink/60">
            Creates a coaching centre on the platform. Assign a teacher to it next.
          </p>

          {state.created ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-4 w-4" />
                <p className="font-semibold">Centre created</p>
              </div>
              <p className="mt-2 text-sm text-emerald-800">
                <strong>{state.created.name}</strong> is ready. Share its teacher
                join code so the teacher can sign up:
              </p>
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-ink">
                {state.created.joinCode}
              </p>
              <p className="mt-2 text-xs text-emerald-800/80">
                Students just pick this centre by name — no code needed.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              <input
                name="name"
                required
                placeholder="e.g. Sunrise Academy, Chennai"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30"
              />
              {state.error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {state.error}
                </p>
              )}
              <SubmitBtn />
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
