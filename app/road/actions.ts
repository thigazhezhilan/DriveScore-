"use server";

/**
 * Mastery Road server actions.
 *
 * Start a targeted "gate quest": generate a personal practice mock at the
 * frontier gate's difficulty tier, then redirect into the existing test flow
 * (`/test?mock=<id>`). The student id is derived from the session server-side —
 * never trusted from the client. The gate's difficulty tier is resolved from
 * the canonical config, so the client can't request an arbitrary tier.
 */

import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { generateGateMock } from "@/lib/db/practice";
import { GATE_CONFIG, GATE_ORDER, PRESCRIPTION_SIZE, type Gate } from "@/lib/mastery";
import { SUBJECTS } from "@/lib/questions/validate";
import type { Subject } from "@/lib/types";

export async function startGateQuest(formData: FormData): Promise<void> {
  const student = await getCurrentStudent();
  if (!student) redirect("/welcome");

  const subjectIn = String(formData.get("subject") ?? "");
  const chapter = String(formData.get("chapter") ?? "").trim();
  const gateIn = String(formData.get("gate") ?? "");

  const subject = SUBJECTS.find((s) => s === subjectIn) as Subject | undefined;
  const gate = GATE_ORDER.find((g) => g === gateIn) as Gate | undefined;
  if (!subject || !chapter || !gate) redirect("/road?error=invalid");

  const cfg = GATE_CONFIG[gate];
  const mockId = await generateGateMock(
    student.id,
    subject,
    chapter,
    cfg.difficulties,
    `${chapter} — ${cfg.label} quest`,
    PRESCRIPTION_SIZE,
  );
  if (!mockId) redirect("/road?error=empty");

  redirect(`/test?mock=${mockId}`);
}
