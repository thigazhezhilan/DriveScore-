/**
 * Mastery Road screen (server component).
 *
 * The game-like progress map: per-subject chapter climbs with four difficulty
 * gates each, the single next "frontier" quest highlighted, and gentle revisit
 * prompts for any decayed gate. Mastery is computed fresh from raw attempts on
 * each load (see `lib/db/mastery.ts`), so it always reflects reality.
 *
 * Deliberately shows movement + next-step only — never a global "% to NEET" or
 * "% to becoming a doctor" meter.
 */

import { getTranslations } from "next-intl/server";
import { requireRole, getCurrentStudent } from "@/lib/auth";
import { getStudentRoad, type RoadData } from "@/lib/db/mastery";
import { RoadClient } from "@/components/road/RoadClient";

export const dynamic = "force-dynamic";

export default async function RoadPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireRole("student");
  const t = await getTranslations("road");

  let data: RoadData = { road: { subjects: [], frontier: null, reinforcements: [] }, prescription: null };
  try {
    const student = await getCurrentStudent();
    if (student) data = await getStudentRoad(student.id);
  } catch {
    // DB not configured/seeded — fall through to the friendly empty state.
  }

  const error =
    searchParams.error === "empty"
      ? t("errorEmpty")
      : searchParams.error === "invalid"
        ? t("errorInvalid")
        : null;

  return <RoadClient data={data} error={error} />;
}
