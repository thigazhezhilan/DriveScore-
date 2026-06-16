"use server";

import { cookies } from "next/headers";
import { getServiceClient } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Locale = "en" | "ta";
const SUPPORTED: Locale[] = ["en", "ta"];

/** Set the UI language: persists to a 1-year cookie and updates the user's profile. */
export async function setLanguage(locale: Locale): Promise<void> {
  if (!SUPPORTED.includes(locale)) return;

  // Long-lived cookie so the preference survives sessions.
  cookies().set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  // Also persist to profile for cross-device / post-cookie-clear recovery.
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const db = getServiceClient();
      await db
        .from("profiles")
        .update({ preferred_language: locale })
        .eq("id", user.id);
    }
  } catch {
    // Non-fatal — the cookie is the authoritative source for next-intl.
  }
}
