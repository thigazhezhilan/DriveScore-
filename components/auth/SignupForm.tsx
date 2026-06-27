"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, GraduationCap, KeyRound, Loader2, Lock, Mail, User, UserPlus } from "lucide-react";
import { signUpAccount, type SignupState } from "@/app/signup/actions";

const initial: SignupState = { error: null, sent: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>{t("creating")} <Loader2 className="h-4 w-4 animate-spin" /></>
      ) : (
        <>{t("createAccountBtn")} <UserPlus className="h-4 w-4" /></>
      )}
    </button>
  );
}

const fieldBase =
  "w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30";

export function SignupForm({ centres }: { centres: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(signUpAccount, initial);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [lang, setLang] = useState<"en" | "ta">("en");
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  if (state.sent) {
    return (
      <div className="card animate-fade-up p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal-deep">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">{t("confirmEmailTitle")}</h2>
        <p className="mt-1.5 text-sm text-ink/60">{t("confirmEmailBody")}</p>
        <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline">
          <ArrowLeft className="h-4 w-4" /> {tc("backToSignIn")}
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
          {t("iAmStudent")}
        </button>
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${role === "teacher" ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}
        >
          {t("iAmTeacher")}
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="role" value={role} />

        {role === "student" && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink/50">
              Preferred language / விரும்பிய மொழி
            </p>
            <input type="hidden" name="preferredLanguage" value={lang} />
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/[0.04] p-1">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${lang === "en" ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}
              >
                English
              </button>
              {/* Tamil — Coming Soon (pipeline paused 2026-06-27) */}
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold text-ink/35 cursor-not-allowed select-none">
                <span className="font-tamil">தமிழ்</span>
                <span className="rounded-full bg-black/[0.07] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink/35">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-ink/40">
              {lang === "en"
                ? "This cannot be changed later."
                : "இதை பின்னர் மாற்ற முடியாது."}
            </p>
          </div>
        )}

        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input name="fullName" required placeholder={t("fullNamePlaceholder")} className={fieldBase} />
        </div>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input name="email" type="email" autoComplete="email" required placeholder={t("signupEmailPlaceholder")} className={fieldBase} />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder={t("passwordPlaceholder")} className={fieldBase} />
        </div>

        <div className="relative">
          <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <select name="centreId" required defaultValue="" className={`${fieldBase} appearance-none`}>
            <option value="" disabled>
              {t("selectCentrePlaceholder")}
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
              placeholder={t("joinCodePlaceholder")}
              className={`${fieldBase} uppercase tracking-widest`}
            />
          </div>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {state.error.startsWith("error") ? t(state.error as Parameters<typeof t>[0]) : state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-4 text-center text-xs text-ink/45">
        {t("alreadyAccount")}{" "}
        <Link href="/login" className="font-semibold text-teal-deep hover:underline">
          {tc("signIn")}
        </Link>
      </p>
    </div>
  );
}
