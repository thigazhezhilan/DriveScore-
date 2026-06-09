"use server";

/**
 * Auth server actions.
 *
 * Login signs in with the user-scoped server client (which sets the session
 * cookies), then resolves the user's role from their profile and redirects to
 * the role's landing page. Logout clears the session.
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/queries";
import { landingFor } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // Resolve role server-side (service client bypasses RLS) and route.
  const profile = await getProfile(data.user.id);
  if (!profile) {
    // Authenticated but no profile/role assigned — treat as a setup problem.
    await supabase.auth.signOut();
    return {
      error: "Your account has no role assigned. Contact your coaching centre.",
    };
  }

  redirect(landingFor(profile.role));
}

export async function logout(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
