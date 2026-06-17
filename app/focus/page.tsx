/**
 * Focus screen (server component) — student-only, private.
 *
 * Computes the three focus sections from the student's live road state (no
 * snapshot needed for now) and hands them to <FocusClient>. No attempt data
 * or diagnostic breakdowns are passed to the client — only the actionable
 * prescription, frontier progress, and optional revisit hint.
 */

import { requireRole, getCurrentStudent } from "@/lib/auth";
import { getStudentFocus, type FocusData } from "@/lib/db/focus";
import { FocusClient } from "@/components/focus/FocusClient";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  await requireRole("student");

  let data: FocusData = { prescription: null, frontier: null, revisit: null };
  try {
    const student = await getCurrentStudent();
    if (student) data = await getStudentFocus(student.id);
  } catch {
    // Fall through to empty state on DB errors.
  }

  return <FocusClient data={data} />;
}
