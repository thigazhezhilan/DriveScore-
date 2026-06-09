"use server";

/**
 * Mock-builder server actions — now for the TEACHER role (centre manager).
 *
 * Guarded by `requireRole("teacher")`; `centre_id` always from the session.
 */

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { listBatchesForCentre } from "@/lib/db/queries";
import {
  createMock,
  deleteMock,
  filterCentreQuestionIds,
  getMockForEdit,
  setMockQuestions,
  setMockStatus,
  updateMockMeta,
  type MockStatus,
} from "@/lib/db/mocks";

export type SaveMockInput = {
  id?: string;
  title: string;
  batchId: string | null;
  questionIds: string[];
  status: MockStatus;
  maxAttempts: number;
};

export type SaveMockResult = { ok: boolean; error?: string; id?: string };

async function teacherCentreId(): Promise<string> {
  const me = await requireRole("teacher");
  if (!me.profile.centreId) {
    throw new Error("Your account isn't linked to a centre.");
  }
  return me.profile.centreId;
}

export async function saveMockAction(input: SaveMockInput): Promise<SaveMockResult> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const title = (input.title ?? "").trim();
  const status: MockStatus = input.status === "published" ? "published" : "draft";
  const batchId = input.batchId || null;
  const maxAttempts = Math.max(1, Math.min(10, Number(input.maxAttempts) || 1));
  const requestedIds = Array.isArray(input.questionIds) ? input.questionIds : [];

  if (!title) return { ok: false, error: "Give the mock a title." };

  if (batchId) {
    const batches = await listBatchesForCentre(centreId);
    if (!batches.some((b) => b.id === batchId)) {
      return { ok: false, error: "Pick a valid batch." };
    }
  }

  const questionIds = await filterCentreQuestionIds(centreId, requestedIds);
  if (questionIds.length !== requestedIds.length) {
    return { ok: false, error: "Some selected questions aren't in your bank." };
  }

  if (status === "published") {
    if (!batchId) return { ok: false, error: "Assign a batch before publishing." };
    if (questionIds.length === 0) {
      return { ok: false, error: "Add at least one question before publishing." };
    }
  }

  try {
    let mockId = input.id;
    if (mockId) {
      const existing = await getMockForEdit(centreId, mockId);
      if (!existing) return { ok: false, error: "Mock not found in your centre." };
      await updateMockMeta(centreId, mockId, { title, batchId, status, maxAttempts });
    } else {
      mockId = await createMock(centreId, { title, batchId, status, maxAttempts });
    }
    await setMockQuestions(mockId, questionIds);

    revalidatePath("/teacher/mocks");
    return { ok: true, id: mockId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setMockStatusAction(
  id: string,
  status: MockStatus,
): Promise<{ error: string | null }> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  try {
    if (status === "published") {
      const mock = await getMockForEdit(centreId, id);
      if (!mock) return { error: "Mock not found." };
      if (!mock.batchId) return { error: "Assign a batch before publishing." };
      if (mock.questionIds.length === 0) {
        return { error: "Add at least one question before publishing." };
      }
    }
    await setMockStatus(centreId, id, status);
    revalidatePath("/teacher/mocks");
    return { error: null };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteMockAction(id: string): Promise<{ error: string | null }> {
  let centreId: string;
  try {
    centreId = await teacherCentreId();
  } catch (e) {
    return { error: (e as Error).message };
  }
  try {
    await deleteMock(centreId, id);
    revalidatePath("/teacher/mocks");
    return { error: null };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
