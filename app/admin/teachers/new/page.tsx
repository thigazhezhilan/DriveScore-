/**
 * Create a teacher account for a centre. Admin-only.
 */

"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2, UserPlus } from "lucide-react";
import { createTeacherAction, type CreateTeacherState } from "@/app/admin/actions";

const initial: CreateTeacherState = { error: null, created: null };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>Creating <Loader2 className="h-4 w-4 animate-spin" /></>
      ) : (
        <>Create teacher login <UserPlus className="h-4 w-4" /></>
      )}
    </button>
  );
}

export default function NewTeacherPage() {
  const [state, formAction] = useFormState(createTeacherAction, initial);

  const copy = () => {
    if (!state.created) return;
    navigator.clipboard
      ?.writeText(
        `Centre: ${state.created.centreName}\nEmail: ${state.created.email}\nPassword: ${state.created.tempPassword}`,
      )
      .catch(() => {});
  };

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
          <h1 className="font-display text-lg font-bold text-ink">Create a teacher account</h1>
        </div>
      </header>

      <section className="animate-fade-up mt-6">
        <div className="card p-5">
          <p className="mb-4 text-sm text-ink/60">
            Creates a login for a coaching centre&apos;s manager. They can then log in
            and manage their centre&apos;s questions, mocks, and students.
          </p>

          {state.created ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-4 w-4" />
                <p className="font-semibold">Teacher account created — share these now</p>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/55">Centre</dt>
                  <dd className="font-medium text-ink">{state.created.centreName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/55">Email</dt>
                  <dd className="font-medium text-ink">{state.created.email}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/55">Temp password</dt>
                  <dd className="font-mono font-semibold text-ink">{state.created.tempPassword}</dd>
                </div>
              </dl>
              <button onClick={copy} className="btn-ghost mt-3 w-full px-3 py-2 text-xs">
                <Copy className="h-3.5 w-3.5" /> Copy credentials
              </button>
              <p className="mt-2 text-[11px] text-emerald-700/80">
                This password won&apos;t be shown again.
              </p>
              <Link href="/admin" className="btn-ghost mt-3 block w-full text-center text-xs">
                Back to dashboard
              </Link>
            </div>
          ) : (
            <TeacherForm formAction={formAction} state={state} />
          )}
        </div>
      </section>
    </main>
  );
}

function TeacherForm({
  formAction,
  state,
}: {
  formAction: (payload: FormData) => void;
  state: CreateTeacherState;
}) {
  return (
    <form action={formAction} className="space-y-3">
      <input
        name="fullName"
        required
        placeholder="Full name"
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="teacher@centre.com"
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30"
      />
      <input
        name="centreId"
        required
        placeholder="Centre ID (UUID from the centres list)"
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30"
      />
      <p className="text-[11px] text-ink/45">
        Find the centre ID by clicking any centre on the{" "}
        <Link href="/admin" className="underline">
          dashboard
        </Link>{" "}
        — it&apos;s in the URL.
      </p>
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
