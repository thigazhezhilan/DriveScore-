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
import { getStudentRoad } from "@/lib/db/mastery";
import { HomeClient, type MasterySnap } from "@/components/home/HomeClient";

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
  let mastery: MasterySnap | null = null;
  try {
    const student = await getCurrentStudent();
    if (student) {
      // Fetch rating + mastery road in parallel. Mastery failures never break
      // the home screen — it just hides the preview card.
      const [ratingResult, roadData] = await Promise.all([
        getRatingSummary(student.id),
        getStudentRoad(student.id).catch(() => null),
      ]);
      rating = ratingResult;
      if (roadData) {
        const allGates = roadData.road.subjects.flatMap((s) =>
          s.chapters.flatMap((c) => c.gates),
        );
        mastery = {
          frontier: roadData.road.frontier
            ? {
                subject: roadData.road.frontier.subject,
                chapter: roadData.road.frontier.chapter,
                gate: roadData.road.frontier.gate,
                gateLabel: roadData.road.frontier.gateLabel,
                reason: roadData.road.frontier.reason,
              }
            : null,
          clearedGates: allGates.filter((g) => g.status === "CLEARED").length,
          totalGates: allGates.length,
        };
      }
    }
  } catch {
    rating = null;
    mastery = null;
  }

  return (
    <HomeClient
      studentName={me.profile.fullName}
      mocks={mocks}
      rating={rating}
      mastery={mastery}
    />
  );
}
