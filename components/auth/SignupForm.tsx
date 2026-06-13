"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, GraduationCap, KeyRound, Loader2, Lock, Mail, User, UserPlus } from "lucide-react";
import { signUpAccount, type SignupState } from "@/app/signup/actions";

const initial: SignupState = { error: null, sent: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>Creating <Loader2 className="h-4 w-4 animate-spin" /></>
      ) : (
        <>Create account <UserPlus className="h-4 w-4" /></>
      )}
    </button>
  );
}

const fieldBase =
  "w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30";

export function SignupForm({ centres }: { centres: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(signUpAccount, initial);
  const [role, setRole] = useState<"student" | "teacher">("student");

  if (state.sent) {
    return (
      <div className="card animate-fade-up p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal-deep">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">Confirm your email</h2>
        <p className="mt-1.5 text-sm text-ink/60">
          We&apos;ve sent a confirmation link to your inbox. Click it to activate
          your account and sign in.
        </p>
        <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="card animate-fade-up p-6">
      {/* Role toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-black/[0.04] p-1">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${role === "student" ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}
        >
          I&apos;m a student
        </button>
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${role === "teacher" ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}
        >
          I&apos;m a teacher
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="role" value={role} />

        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input name="fullName" required placeholder="Full name" className={fieldBase} />
        </div>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input name="email" type="email" autoComplete="email" required placeholder="you@email.com" className={fieldBase} />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Password (min 8 chars)" className={fieldBase} />
        </div>

        <div className="relative">
          <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <select name="centreId" required defaultValue="" className={`${fieldBase} appearance-none`}>
            <option value="" disabled>
              Select your coaching centre…
            </option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {role === "teacher" && (
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              name="joinCode"
              required
              placeholder="Teacher join code (from your centre)"
              className={`${fieldBase} uppercase tracking-widest`}
            />
          </div>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-4 text-center text-xs text-ink/45">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-deep hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
