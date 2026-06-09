/**
 * Home (server component). Student landing.
 *
 * Authoritatively requires the `student` role — admins/teachers who land here
 * are redirected to their own dashboards. Loads the PUBLISHED mocks assigned to
 * the student's batch (RLS-scoped) and hands them to the client <HomeClient>.
 */

import { requireRole } from "@/lib/auth";
import { listPublishedMocksForStudent, type StudentMock } from "@/lib/db/mocks";
import { HomeClient } from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await requireRole("student");

  let mocks: StudentMock[] = [];
  try {
    mocks = await listPublishedMocksForStudent();
  } catch {
    // DB not configured/seeded yet — show the friendly empty state.
    mocks = [];
  }

  return <HomeClient studentName={me.profile.fullName} mocks={mocks} />;
}
