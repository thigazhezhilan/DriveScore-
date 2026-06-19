"use server";

/**
 * Auth server actions.
 *
 * Login signs in with the user-scoped server client (which sets the session
 * cookies), then resolves the user's role from their profile and redirects to
 * the role's landing page. Logout clears the session.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/queries";
import { landingFor } from "@/lib/auth";

export type LoginState = {
  error: string | null;
  greeting: {
    firstName: string;
    language: "en" | "ta";
    redirectTo: string;
  } | null;
};

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "errorEmailPassword", greeting: null };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "errorWrongCredentials", greeting: null };
  }

  // Resolve role server-side (service client bypasses RLS) and route.
  const profile = await getProfile(data.user.id);
  if (!profile) {
    // Authenticated but no profile/role assigned — treat as a setup problem.
    await supabase.auth.signOut();
    return { error: "errorNoRole", greeting: null };
  }

  // Language not yet chosen → gate the student before giving dashboard access.
  if (profile.preferredLanguage === null) {
    redirect("/language-select");
  }

  // Sync the UI language from the user's saved preference so the first load
  // after login respects their chosen language even if the cookie was cleared.
  if (profile.preferredLanguage === "ta") {
    cookies().set("NEXT_LOCALE", "ta", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  } else {
    cookies().set("NEXT_LOCALE", "en", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  // Return greeting data — the client will speak then navigate.
  // This keeps the browser's user-gesture context alive for Web Speech API.
  return {
    error: null,
    greeting: {
      firstName: profile.fullName?.split(" ")[0] ?? "",
      language: profile.preferredLanguage,
      redirectTo: landingFor(profile.role),
    },
  };
}

export async function logout(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
