"use client";

/**
 * Admin form to create a student login. On success it shows the temporary
 * password ONCE so the admin can pass it on.
 */

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { createStudent, type CreateStudentState } from "@/app/admin/actions";

const initial: CreateStudentState = { error: null, created: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>
          Creating <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          Create student login <UserPlus className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export function CreateStudentForm() {
  const [state, formAction] = useFormState(createStudent, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs after a successful create.
  useEffect(() => {
    if (state.created) formRef.current?.reset();
  }, [state.created]);

  return (
    <div className="card-glass p-5">
      <h2 className="font-display font-semibold text-paper">Add a student</h2>
      <p className="mt-0.5 text-xs text-paper/55">
        Most students sign themselves up. Use this to add one manually — they
        join your centre and get a login immediately. You&apos;ll see a temporary
        password once.
      </p>

      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input
          name="fullName"
          required
          placeholder="Full name"
          className="field-dark"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="student@email.com"
          className="field-dark"
        />

        {state.error && (
          <p className="rounded-lg bg-pop/15 px-3 py-2 text-sm font-medium text-[#FF9A91]">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      {state.created && <CredentialCard created={state.created} />}
    </div>
  );
}

function CredentialCard({
  created,
}: {
  created: { email: string; tempPassword: string };
}) {
  const copy = () => {
    navigator.clipboard
      ?.writeText(`Email: ${created.email}\nPassword: ${created.tempPassword}`)
      .catch(() => {});
  };

  return (
    <div className="mt-4 rounded-xl border border-energy/30 bg-energy/[0.08] p-4">
      <div className="flex items-center gap-2 text-energy">
        <Check className="h-4 w-4" />
        <p className="text-sm font-semibold">Account created — share these now</p>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-paper/55">Email</dt>
          <dd className="font-medium text-paper">{created.email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-paper/55">Temp password</dt>
          <dd className="font-mono font-semibold text-paper">
            {created.tempPassword}
          </dd>
        </div>
      </dl>
      <button
        onClick={copy}
        className="btn-ghost-dark mt-3 w-full px-3 py-2 text-xs"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy credentials
      </button>
      <p className="mt-2 text-[11px] text-energy/70">
        This password won&apos;t be shown again. The student can change it later
        (password reset arrives in a future update).
      </p>
    </div>
  );
}
