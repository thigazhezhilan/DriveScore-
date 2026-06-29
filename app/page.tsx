/**
 * Home (server component). Student landing.
 *
 * Authoritatively requires the `student` role — admins/teachers who land here
 * are redirected to their own dashboards. Loads the PUBLISHED mocks assigned to
 * the student's batch (RLS-scoped), the skill rating, and a lightweight mastery
 * snapshot (frontier gate + progress counts) — all in parallel.
 */

import { requireRole, getCurrentStudent } from "@/lib/auth";
import { listPublishedMocksForStudent, type StudentMock } from "@/lib/db/mocks";
import { getRatingSummary, type RatingSummary } from "@/lib/db/ratings";
import { HomeClient } from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await requireRole("student");

  let mocks: StudentMock[] = [];
  try {
    mocks = await listPublishedMocksForStudent();
  } catch {
    mocks = [];
  }

  let rating: RatingSummary | null = null;
  try {
    const student = await getCurrentStudent();
    if (student) {
      rating = await getRatingSummary(student.id);
    }
  } catch {
    rating = null;
  }

  return (
    <HomeClient
      studentName={me.profile.fullName}
      mocks={mocks}
      rating={rating}
    />
  );
}
