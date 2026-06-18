"use server";

/**
 * Public self-signup (student or teacher).
 *
 * Flow:
 *   1. Validate inputs. For teachers, verify the centre join code (service key).
 *   2. supabase.auth.signUp — sends a confirmation email (emailRedirectTo →
 *      /auth/confirm, which establishes the session and lands them on their
 *      role page). With "Confirm email" ON, no session is returned yet.
 *   3. Create the profile (role + centre) and, for students, the students row,
 *      via the service key — so role/centre are set server-side, never trusted
 *      from the browser beyond the centre/code the user explicitly chose.
 *
 * Returns `sent: true` so the UI tells them to confirm via email.
 */

import { headers, cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/db/client";

export type SignupState = { error: string | null; sent: boolean };

const ROLE_LABEL: Record<string, string> = {
  admin: "an admin",
  teacher: "a teacher",
  student: "a student",
};

/**
 * Look up the role already registered for an email (paginated auth admin
 * lookup, same approach as scripts/seed.ts). Returns null if no account
 * exists for that email.
 */
async function findRegisteredRole(
  service: ReturnType<typeof getServiceClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      const { data: profile } = await service
        .from("profiles")
        .select("role")
        .eq("id", found.id)
        .maybeSingle();
      return profile?.role ?? "student";
    }
    if (data.users.length < 1000) return null;
  }
}

export async function signUpAccount(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const role = formData.get("role") === "teacher" ? "teacher" : "student";
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const centreId = String(formData.get("centreId") ?? "").trim();
  const joinCode = String(formData.get("joinCode") ?? "").trim();
  const preferredLanguage = formData.get("preferredLanguage") === "ta" ? "ta" : "en";

  if (!fullName || !email || !password || !centreId) {
    return { error: "errorFillAll", sent: false };
  }
  if (password.length < 8) {
    return { error: "errorPasswordLength", sent: false };
  }

  const service = getServiceClient();

  // Validate the centre (and, for teachers, the join code).
  const { data: centre } = await service
    .from("centres")
    .select("id, join_code")
    .eq("id", centreId)
    .maybeSingle();
  if (!centre) return { error: "errorInvalidCentre", sent: false };
  if (role === "teacher") {
    const expected = String(centre.join_code ?? "").trim().toUpperCase();
    if (!expected || joinCode.toUpperCase() !== expected) {
      return { error: "errorBadJoinCode", sent: false };
    }
  }

  const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const next = role === "teacher" ? "/teacher" : "/";

  // Create the auth user (confirmation email sent by Supabase).
  const supabase = createSupabaseServerClient();
  const { data: signUp, error: suErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { full_name: fullName },
    },
  });
  if (suErr) {
    if (/already.*regist|exists/i.test(suErr.message)) {
      const existingRole = await findRegisteredRole(service, email);
      const as = existingRole ? ` as ${ROLE_LABEL[existingRole] ?? "a user"}` : "";
      return { error: "errorEmailRegistered", sent: false };
    }
    return { error: suErr.message, sent: false };
  }
  const userId = signUp.user?.id;
  if (!userId) return { error: "errorCreateFailed", sent: false };

  // Set role + centre + language server-side (service key bypasses RLS).
  const { error: pErr } = await service.from("profiles").upsert({
    id: userId,
    role,
    centre_id: centreId,
    full_name: fullName,
    ...(role === "student" ? { preferred_language: preferredLanguage } : {}),
  });
  if (pErr) {
    // With "Confirm email" on, signUp() for an already-registered email
    // returns an obfuscated user whose id has no row in auth.users — the
    // profiles upsert above then fails its foreign-key check.
    if (pErr.code === "23503") {
      const existingRole = await findRegisteredRole(service, email);
      const as = existingRole ? ` as ${ROLE_LABEL[existingRole] ?? "a user"}` : "";
      return { error: "errorEmailRegistered", sent: false };
    }
    return { error: pErr.message, sent: false };
  }

  if (role === "student") {
    // Link a students row (idempotent-ish: only insert if absent).
    const { data: existing } = await service
      .from("students")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    if (!existing) {
      const { error: sErr } = await service.from("students").insert({
        centre_id: centreId,
        name: fullName,
        profile_id: userId,
      });
      if (sErr) return { error: sErr.message, sent: false };
    }
  }

  // Set locale cookie immediately so the confirmation-email landing is in the
  // right language (only takes effect when email confirm is disabled / auto-confirmed).
  if (role === "student") {
    cookies().set("NEXT_LOCALE", preferredLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  return { error: null, sent: true };
}
