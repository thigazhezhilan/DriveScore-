"use server";

import { cookies } from "next/headers";
import { getServiceClient } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Locale = "en" | "ta";
const SUPPORTED: Locale[] = ["en", "ta"];

/**
 * Set the UI language cookie for public / marketing pages.
 *
 * For authenticated users: only writes to the profile when preferred_language
 * is currently null (first-time set). If it is already set the DB trigger would
 * block any change anyway, so we simply skip the update and let the cookie
 * serve as the temporary locale signal (the locked value is the authoritative one).
 *
 * Students with a locked language should not see the LanguageToggle at all —
 * this action exists for the marketing site and unauthenticated visitors.
 */
export async function setLanguage(locale: Locale): Promise<void> {
  if (!SUPPORTED.includes(locale)) return;

  // Long-lived cookie so the preference survives sessions.
  cookies().set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  // Persist to profile only when the language is not yet locked.
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const db = getServiceClient();
      const { data: profile } = await db
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      // Only update if not yet set — the trigger blocks changes anyway, but
      // this avoids surfacing a Postgres exception in server logs.
      if (profile && profile.preferred_language === null) {
        await db
          .from("profiles")
          .update({ preferred_language: locale })
          .eq("id", user.id);
      }
    }
  } catch {
    // Non-fatal — the cookie is the authoritative source for next-intl on
    // the marketing site.
  }
}
