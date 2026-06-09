import "server-only";

/**
 * Platform super-admin DB functions.
 *
 * All operations use the service key (bypasses RLS) because the admin role is
 * cross-centre and does not have a centre_id to scope queries. This module is
 * only imported by admin server actions / pages — never by client code.
 */

import { getServiceClient } from "./client";

export type CentreRow = {
  id: string;
  name: string;
  createdAt: string;
  questionCount: number;
  mockCount: number;
  studentCount: number;
  teacherEmail: string | null;
};

/** All centres on the platform with aggregate stats. */
export async function listAllCentres(): Promise<CentreRow[]> {
  const supabase = getServiceClient();

  const { data: centres, error } = await supabase
    .from("centres")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!centres || centres.length === 0) return [];

  // Fetch stats for each centre in parallel.
  const rows = await Promise.all(
    centres.map(async (c) => {
      const [{ count: qCount }, { count: mCount }, batches] = await Promise.all([
        supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("centre_id", c.id)
          .then((r) => ({ count: r.count ?? 0 })),
        supabase
          .from("mocks")
          .select("id", { count: "exact", head: true })
          .eq("centre_id", c.id)
          .then((r) => ({ count: r.count ?? 0 })),
        supabase
          .from("batches")
          .select("id")
          .eq("centre_id", c.id)
          .then((r) => r.data ?? []),
      ]);

      let studentCount = 0;
      if (batches.length > 0) {
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .in("batch_id", batches.map((b) => b.id));
        studentCount = count ?? 0;
      }

      // Find the teacher profile for this centre.
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("centre_id", c.id)
        .eq("role", "teacher")
        .limit(1)
        .maybeSingle();

      let teacherEmail: string | null = null;
      if (teacherProfile) {
        const { data: authUser } = await supabase.auth.admin.getUserById(teacherProfile.id);
        teacherEmail = authUser?.user?.email ?? null;
      }

      return {
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
        questionCount: qCount,
        mockCount: mCount,
        studentCount,
        teacherEmail,
      };
    }),
  );

  return rows;
}

/** Create a new coaching centre. Returns the new row. */
export async function createCentre(
  name: string,
): Promise<{ id: string; name: string }> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("centres")
    .insert({ name })
    .select("id, name")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name };
}

/** Create a teacher auth account + profile for a centre. */
export async function createTeacherAccount(params: {
  fullName: string;
  email: string;
  centreId: string;
  tempPassword: string;
}): Promise<{ email: string; tempPassword: string; centreName: string }> {
  const supabase = getServiceClient();

  // Validate the centre exists.
  const { data: centre, error: cErr } = await supabase
    .from("centres")
    .select("name")
    .eq("id", params.centreId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!centre) throw new Error("Centre not found.");

  const { data: created, error: uErr } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.tempPassword,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
  });
  if (uErr) throw uErr;

  const { error: pErr } = await supabase.from("profiles").upsert({
    id: created.user.id,
    role: "teacher",
    centre_id: params.centreId,
    full_name: params.fullName,
  });
  if (pErr) throw pErr;

  return {
    email: params.email,
    tempPassword: params.tempPassword,
    centreName: centre.name,
  };
}

/** Single centre with its stats (for the centre-detail admin view). */
export async function getCentreDetail(centreId: string): Promise<{
  id: string;
  name: string;
  batches: { id: string; name: string }[];
  questionCount: number;
  mockCount: number;
  students: { id: string; name: string; batchName: string; latestAttemptId: string | null }[];
}> {
  const supabase = getServiceClient();

  const { data: centre, error: cErr } = await supabase
    .from("centres")
    .select("id, name")
    .eq("id", centreId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!centre) throw new Error("Centre not found.");

  const { data: batches } = await supabase
    .from("batches")
    .select("id, name")
    .eq("centre_id", centreId)
    .order("created_at");

  const batchList = batches ?? [];
  const batchNameMap = new Map(batchList.map((b) => [b.id, b.name]));

  const [{ count: questionCount }, { count: mockCount }] = await Promise.all([
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", centreId)
      .then((r) => ({ count: r.count ?? 0 })),
    supabase
      .from("mocks")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", centreId)
      .then((r) => ({ count: r.count ?? 0 })),
  ]);

  let students: { id: string; name: string; batchName: string; latestAttemptId: string | null }[] = [];
  if (batchList.length > 0) {
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, name, batch_id")
      .in("batch_id", batchList.map((b) => b.id))
      .order("created_at");

    students = await Promise.all(
      (studentRows ?? []).map(async (s) => {
        const { data: latest } = await supabase
          .from("attempts")
          .select("id")
          .eq("student_id", s.id)
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: false })
          .limit(1);
        return {
          id: s.id,
          name: s.name,
          batchName: batchNameMap.get(s.batch_id) ?? "—",
          latestAttemptId: latest?.[0]?.id ?? null,
        };
      }),
    );
  }

  return {
    id: centre.id,
    name: centre.name,
    batches: batchList,
    questionCount: questionCount ?? 0,
    mockCount: mockCount ?? 0,
    students,
  };
}
