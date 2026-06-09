"use server";

/**
 * Server actions split by role:
 *
 * TEACHER actions — centre managers creating students for their own centre.
 * ADMIN actions   — platform super-admin creating centres and teacher accounts.
 *
 * All privileged ops (auth.admin.createUser) use the service key server-side.
 * centre_id is always derived from the session, never trusted from the client.
 */

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createStudentAccount, listBatchesForCentre } from "@/lib/db/queries";
import { createCentre, createTeacherAccount } from "@/lib/db/admin";

// ─────────────────────────── Teacher: create student ─────────────────────────

export type CreateStudentState = {
  error: string | null;
  created: { email: string; tempPassword: string } | null;
};

function tempPassword(): string {
  const part = Math.random().toString(36).slice(2, 6).toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Neet-${part}-${num}`;
}

export async function createStudent(
  _prev: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const me = await requireRole("teacher");
  const centreId = me.profile.centreId;
  if (!centreId) {
    return { error: "Your account isn't linked to a centre.", created: null };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const batchId = String(formData.get("batchId") ?? "");

  if (!fullName || !email || !batchId) {
    return { error: "Name, email and batch are all required.", created: null };
  }

  const batches = await listBatchesForCentre(centreId);
  if (!batches.some((b) => b.id === batchId)) {
    return { error: "Pick a valid batch.", created: null };
  }

  try {
    const result = await createStudentAccount({
      fullName,
      email,
      batchId,
      centreId,
      tempPassword: tempPassword(),
    });
    revalidatePath("/teacher");
    return { error: null, created: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already.*regist|exists/i.test(msg)) {
      return { error: "That email already has an account.", created: null };
    }
    return { error: msg, created: null };
  }
}

// ─────────────────────────── Admin: create centre ────────────────────────────

export type CreateCentreState = {
  error: string | null;
  created: { id: string; name: string } | null;
};

export async function createCentreAction(
  _prev: CreateCentreState,
  formData: FormData,
): Promise<CreateCentreState> {
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Centre name is required.", created: null };

  try {
    const centre = await createCentre(name);
    revalidatePath("/admin/centres");
    return { error: null, created: centre };
  } catch (err) {
    return { error: (err instanceof Error ? err.message : String(err)), created: null };
  }
}

// ─────────────────────────── Admin: create teacher ───────────────────────────

export type CreateTeacherState = {
  error: string | null;
  created: { email: string; tempPassword: string; centreName: string } | null;
};

export async function createTeacherAction(
  _prev: CreateTeacherState,
  formData: FormData,
): Promise<CreateTeacherState> {
  await requireRole("admin");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const centreId = String(formData.get("centreId") ?? "").trim();

  if (!fullName || !email || !centreId) {
    return { error: "Name, email and centre are all required.", created: null };
  }

  const pwd =
    "Teach-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "-" +
    Math.floor(1000 + Math.random() * 9000);

  try {
    const result = await createTeacherAccount({ fullName, email, centreId, tempPassword: pwd });
    revalidatePath("/admin/centres");
    return { error: null, created: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already.*regist|exists/i.test(msg)) {
      return { error: "That email already has an account.", created: null };
    }
    return { error: msg, created: null };
  }
}
