"use client";

import { useEffect } from "react";

const SESSION_KEY = "loginGreetingPlayed";

function buildText(name: string, language: "en" | "ta"): string {
  return language === "ta"
    ? `${name}, எல்லாம் ரெடி. ஸ்டார்ட் பண்ணலாமா?`
    : `Hey ${name}, your seat's ready. Let's go!`;
}

function speakWith(text: string, langCode: string): void {
  const voices = window.speechSynthesis.getVoices();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = voices.find((v) => v.lang === langCode) ?? null;
  utt.rate = 0.95;
  utt.volume = 0.85;
  window.speechSynthesis.speak(utt);
}

/**
 * Plays a one-sentence spoken greeting once per login session.
 * Safe to call on every render — sessionStorage prevents replay on refresh.
 * Fails silently if Web Speech API is unavailable.
 * Future: gate behind a `muted` preference prop before calling speak().
 */
export function useLoginGreeting(
  name: string | null,
  language: "en" | "ta",
): void {
  useEffect(() => {
    if (!name) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "1");

    const text = buildText(name, language);
    const langCode = language === "ta" ? "ta-IN" : "en-IN";

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakWith(text, langCode);
    } else {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        function handler() {
          window.speechSynthesis.removeEventListener("voiceschanged", handler);
          speakWith(text, langCode);
        },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount — name and language are immutable per session
}
