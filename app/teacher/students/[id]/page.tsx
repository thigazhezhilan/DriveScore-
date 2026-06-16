/**
 * Teacher's per-student progress view (`/teacher/students/[id]`).
 *
 * Reuses the student progress dashboard, framed for the teacher. Access is
 * RLS-guarded: the teacher's session can only read a student that belongs to a
 * batch they own — an out-of-centre id resolves to no row and bounces back.
 */

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentProgress, type StudentProgress } from "@/lib/db/progress";
import { ProgressClient } from "@/components/progress/ProgressClient";

export const dynamic = "force-dynamic";

const EMPTY: StudentProgress = {
  trend: [],
  recent: [],
  strengths: [],
  weaknesses: [],
  attemptCount: 0,
};

export default async function TeacherStudentPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("teacher");
  const tt = await getTranslations("teacher");

  // RLS scopes this to the teacher's own students; anything else → no row.
  const sb = createSupabaseServerClient();
  const { data: student } = await sb
    .from("students")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();
  if (!student) redirect("/teacher");

  let progress: StudentProgress = EMPTY;
  try {
    progress = await getStudentProgress(params.id);
  } catch {
    progress = EMPTY;
  }

  return (
    <ProgressClient
      progress={progress}
      eyebrow={tt("studentProgress")}
      title={student.name as string}
      backHref="/teacher"
      backLabel={tt("dashboard")}
    />
  );
}
