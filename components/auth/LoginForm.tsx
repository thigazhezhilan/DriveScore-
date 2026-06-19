"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogIn, Loader2, Lock, Mail } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";
import { Logo } from "@/components/brand/Logo";

const SESSION_KEY = "loginGreetingPlayed";
const initial: LoginState = { error: null, greeting: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>
          {ta("signingIn")} <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          {tc("signIn")} <LogIn className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

/** The bare form fields + error + submit button, no wrapper or header. */
export function LoginFormBody({ state, formAction }: {
  state: LoginState;
  formAction: (payload: FormData) => void;
}) {
  const t = useTranslations("auth");
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/50"
        >
          {t("email")}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/50"
        >
          {t("password")}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
          />
        </div>
        <div className="mt-1.5 text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-teal-deep hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {state.error.startsWith("error") ? t(state.error as Parameters<typeof t>[0]) : state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

/**
 * Full-page login form with DriveScore branding header.
 * Used on standalone login pages (/teacher, /admin, /welcome inline).
 *
 * Pass `embedded={true}` to skip the page wrapper (min-h-dvh) and show just
 * the header + form card — for embedding inside a larger page section.
 * Pass `theme="dark"` when the surrounding background is dark (#06140f) so
 * the note text uses paper/50 instead of ink/45.
 */
export function LoginForm({
  embedded = false,
  theme = "light",
}: {
  embedded?: boolean;
  theme?: "light" | "dark";
}) {
  const [state, formAction] = useFormState(login, initial);
  const t = useTranslations("auth");
  const router = useRouter();

  useEffect(() => {
    const g = state.greeting;
    if (!g) return;

    sessionStorage.setItem(SESSION_KEY, "1");

    const text =
      g.language === "ta"
        ? `${g.firstName}, எல்லாம் ரெடி. ஸ்டார்ட் பண்ணலாமா?`
        : `Hey ${g.firstName}, your seat's ready. Let's go!`;
    const langCode = g.language === "ta" ? "ta-IN" : "en-IN";
    const dest = g.redirectTo;

    function navigate() {
      router.push(dest);
    }

    if (!g.firstName || typeof window === "undefined" || !window.speechSynthesis) {
      navigate();
      return;
    }

    // Navigate after a short delay so speech can start before the page transitions.
    // Next.js client-side navigation does not destroy the window, so speech
    // continues playing on the new page.
    function doSpeak(voices: SpeechSynthesisVoice[]) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.voice = voices.find((v) => v.lang === langCode) ?? null;
      utt.rate = 0.95;
      utt.volume = 0.85;
      window.speechSynthesis.speak(utt);
      setTimeout(navigate, 150);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      const fallback = setTimeout(navigate, 3000);
      window.speechSynthesis.addEventListener("voiceschanged", function h() {
        window.speechSynthesis.removeEventListener("voiceschanged", h);
        clearTimeout(fallback);
        doSpeak(window.speechSynthesis.getVoices());
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.greeting]);

  const header = (
    <div className="animate-fade-up mb-8">
      <Logo
        size={44}
        wordmarkClassName={`text-2xl ${theme === "dark" ? "text-paper" : "text-ink"}`}
      />
      <p
        className={`mt-2.5 text-xs font-medium ${
          theme === "dark" ? "text-energy" : "text-teal-deep"
        }`}
      >
        {t("signInToAccount")}
      </p>
    </div>
  );

  const card = (
    <div className="card animate-fade-up p-6">
      <LoginFormBody state={state} formAction={formAction} />
    </div>
  );

  const noteColor = theme === "dark" ? "text-paper/60" : "text-ink/50";
  const linkColor = theme === "dark" ? "text-energy" : "text-teal-deep";
  const note = (
    <p className={`animate-fade-up mt-5 text-center text-xs ${noteColor}`}>
      {t("newToDS")}{" "}
      <Link href="/signup" className={`font-semibold ${linkColor} hover:underline`}>
        {t("createAnAccount")}
      </Link>
    </p>
  );

  if (embedded) {
    return (
      <div>
        {card}
        {note}
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      {header}
      {card}
      {note}
    </main>
  );
}
