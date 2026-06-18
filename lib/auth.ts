import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getProfile,
  getStudentByProfileId,
  type Profile,
} from "@/lib/db/queries";

/** Auth roles — distinct from the report-view personas in `lib/types.ts`. */
export type AuthRole = Profile["role"];

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Profile;
};

/** The landing page each role is sent to after login / when out of area. */
export function landingFor(role: Profile["role"]): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    default:
      return "/";
  }
}

/**
 * The current authenticated user + profile, or null if signed out / without a
 * profile row. Does not redirect.
 *
 * Wrapped in React cache() so multiple server components in the same render
 * share one result instead of each making 2 round trips to Supabase.
 */
export const getCurrentUser = cache(async function (): Promise<CurrentUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  return { id: user.id, email: user.email ?? null, profile };
});

/** Require any logged-in user with a profile, else go to /welcome. */
export async function requireUser(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/welcome");
  return me;
}

/**
 * Require a specific role. If logged in as the wrong role, bounce to that
 * user's own landing page (not an error).
 *
 * For the student role: also enforces the language gate — a student whose
 * preferred_language is null (not yet chosen) is redirected to /language-select
 * before they can access any student page.
 */
export async function requireRole(role: AuthRole): Promise<CurrentUser> {
  const me = await requireUser();
  if (me.profile.role !== role) redirect(landingFor(me.profile.role));

  // Language gate: students must choose their permanent language before use.
  if (role === "student" && me.profile.preferredLanguage === null) {
    redirect("/language-select");
  }

  return me;
}

/** The `students` row for the current user (student role), or null. */
export const getCurrentStudent = cache(async function (): Promise<{
  id: string;
  name: string;
  centreId: string | null;
} | null> {
  const me = await getCurrentUser();
  if (!me || me.profile.role !== "student") return null;
  return getStudentByProfileId(me.id);
});
