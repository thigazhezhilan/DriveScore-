"use server";

/**
 * First-time-only language selection.
 *
 * This action is the ONLY path that writes preferred_language for a student.
 * The DB trigger (trg_lock_preferred_language) enforces immutability server-side:
 * once a non-null value is stored, any attempt to change it raises an exception.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Attempt the UPDATE — the trigger blocks it if already set.
 *   3. Set the NEXT_LOCALE cookie so next-intl picks up the right messages
 *      immediately on redirect (same technique as login/setLanguage).
 *   4. Redirect to the student dashboard.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/db/client";
import { landingFor } from "@/lib/auth";
import { getProfile } from "@/lib/db/queries";

type Locale = "en" | "ta";
const SUPPORTED: Locale[] = ["en", "ta"];

export type SelectLanguageState = { error: string | null };

export async function selectFirstLanguage(
  _prev: SelectLanguageState,
  formData: FormData,
): Promise<SelectLanguageState> {
  const locale = formData.get("locale") as Locale | null;
  if (!locale || !SUPPORTED.includes(locale)) {
    return { error: "Pick a language to continue." };
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const db = getServiceClient();

  // Verify the language is not already set (belt-and-suspenders before the
  // DB trigger fires — gives a friendlier error message).
  const profile = await getProfile(user.id);
  if (profile?.preferredLanguage !== null) {
    // Already locked — just sync the cookie and go.
    const locked = profile?.preferredLanguage ?? "en";
    cookies().set("NEXT_LOCALE", locked, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
    redirect(landingFor(profile?.role ?? "student"));
  }

  // Write to DB — the trigger blocks this if somehow already set.
  const { error: dbErr } = await db
    .from("profiles")
    .update({ preferred_language: locale })
    .eq("id", user.id);

  if (dbErr) {
    // The trigger fires as a Postgres exception; Supabase surfaces it here.
    if (dbErr.message?.includes("locked")) {
      return { error: "Your language is already locked and cannot be changed." };
    }
    return { error: "Could not save your choice. Please try again." };
  }

  // Persist to cookie so next-intl loads the right messages on the very next
  // request (no extra DB round-trip needed for locale resolution).
  cookies().set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  redirect(landingFor(profile?.role ?? "student"));
}
