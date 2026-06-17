"use server";

/**
 * Focus-screen server actions.
 *
 * startFocusPractice — generate a focus-tagged practice mock for the
 * student's current frontier gate, then redirect into the test flow.
 * The mock gets kind = "focus" so it stays invisible to teacher analytics.
 *
 * startRevisitPractice — same for a decayed gate the student wants to revisit.
 *
 * In both cases the student id is derived from the session server-side.
 * The gate/chapter/subject are validated against canonical config so the
 * client can't request an arbitrary tier.
 */

import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { generateFocusMock } from "@/lib/db/practice";
import { GATE_CONFIG, GATE_ORDER, PRESCRIPTION_SIZE, type Gate } from "@/lib/mastery";
import { SUBJECTS } from "@/lib/questions/validate";
import type { Subject } from "@/lib/types";

export async function startFocusPractice(formData: FormData): Promise<void> {
  const student = await getCurrentStudent();
  if (!student) redirect("/welcome");

  const subjectIn = String(formData.get("subject") ?? "");
  const chapter   = String(formData.get("chapter") ?? "").trim();
  const gateIn    = String(formData.get("gate") ?? "");

  const subject = SUBJECTS.find((s) => s === subjectIn) as Subject | undefined;
  const gate    = GATE_ORDER.find((g) => g === gateIn) as Gate | undefined;
  if (!subject || !chapter || !gate) redirect("/focus?error=invalid");

  const cfg    = GATE_CONFIG[gate];
  const mockId = await generateFocusMock(
    student.id,
    subject,
    chapter,
    cfg.difficulties,
    `${chapter} — ${cfg.label} focus`,
    PRESCRIPTION_SIZE,
  );
  if (!mockId) redirect("/focus?error=empty");

  redirect(`/test?mock=${mockId}`);
}

export async function startRevisitPractice(formData: FormData): Promise<void> {
  const student = await getCurrentStudent();
  if (!student) redirect("/welcome");

  const subjectIn = String(formData.get("subject") ?? "");
  const chapter   = String(formData.get("chapter") ?? "").trim();
  const gateIn    = String(formData.get("gate") ?? "");

  const subject = SUBJECTS.find((s) => s === subjectIn) as Subject | undefined;
  const gate    = GATE_ORDER.find((g) => g === gateIn) as Gate | undefined;
  if (!subject || !chapter || !gate) redirect("/focus?error=invalid");

  const cfg    = GATE_CONFIG[gate];
  const mockId = await generateFocusMock(
    student.id,
    subject,
    chapter,
    cfg.difficulties,
    `${chapter} — ${cfg.label} revisit`,
    PRESCRIPTION_SIZE,
  );
  if (!mockId) redirect("/focus?error=empty");

  redirect(`/test?mock=${mockId}`);
}
