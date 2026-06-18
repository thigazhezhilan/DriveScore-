"use server";

/**
 * Student self-practice server actions.
 *
 * Generate a personal mock from the DriveScore global pool, then redirect into
 * the existing test flow (`/test?mock=<id>`). The student id is derived from the
 * session server-side — never trusted from the client.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentStudent } from "@/lib/auth";
import { generateFullMock, generateLessonMock } from "@/lib/db/practice";
import { SUBJECTS } from "@/lib/questions/validate";
import type { Subject } from "@/lib/types";

export async function startLessonPractice(formData: FormData): Promise<void> {
  const student = await getCurrentStudent();
  if (!student) redirect("/welcome");

  const subjectIn = String(formData.get("subject") ?? "");
  const chapter = String(formData.get("chapter") ?? "").trim();
  const subject = SUBJECTS.find((s) => s === subjectIn) as Subject | undefined;
  if (!subject || !chapter) redirect("/practice?error=invalid");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as "en" | "ta";
  const mockId = await generateLessonMock(student.id, subject, chapter, 15, locale);
  if (!mockId) redirect("/practice?error=empty");

  redirect(`/test?mock=${mockId}`);
}

export async function startFullMock(): Promise<void> {
  const student = await getCurrentStudent();
  if (!student) redirect("/welcome");

  const mockId = await generateFullMock(student.id);
  if (!mockId) redirect("/practice?error=empty");

  redirect(`/test?mock=${mockId}`);
}
