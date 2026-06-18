/**
 * Language Selection Gate
 *
 * Every new student (self-signup or teacher-added) must pass through here
 * before they can reach the dashboard. The choice is permanent — the DB
 * trigger locks preferred_language once written.
 *
 * This page is also shown if the cookie-based locale and the DB value are
 * both null (e.g. fresh device, cleared cookies). It is NEVER shown to a
 * student whose preferred_language is already set.
 */

import { redirect } from "next/navigation";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { LanguageSelectClient } from "./LanguageSelectClient";

export default async function LanguageSelectPage() {
  const me = await getCurrentUser();

  // Not logged in → send to login.
  if (!me) redirect("/login");

  // Language already locked → skip this screen and go straight to the dashboard.
  if (me.profile.preferredLanguage !== null) {
    redirect(landingFor(me.profile.role));
  }

  return <LanguageSelectClient role={me.profile.role} />;
}
