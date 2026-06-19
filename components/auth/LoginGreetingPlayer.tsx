"use client";

import { useLoginGreeting } from "@/hooks/useLoginGreeting";

/** Renders nothing. Bridges server pages to the client-only greeting hook. */
export function LoginGreetingPlayer({
  name,
  language,
}: {
  name: string | null;
  language: "en" | "ta";
}) {
  useLoginGreeting(name, language);
  return null;
}
