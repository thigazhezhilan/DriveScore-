/**
 * Seed ~30 days of realistic practice for a whole demo BATCH, so both the
 * student dashboard (/progress) and the teacher dashboard (/teacher) look
 * "lived-in" for demos.
 *
 * Every student in the "Demo NEET Centre" gets an archetype (active / steady /
 * lazy / struggling / inactive) that shapes how much and how well they practise,
 * giving the class a real spread: a leaderboard, a class average, weak chapters,
 * and some students inactive this week. The logged-in student (Aarav Menon) is
 * forced "active" so their personal dashboard is rich.
 *
 * It runs the REAL engine: each simulated attempt is graded by lib/grade and
 * scored by lib/rating, then written to the same tables the live app writes.
 * Per student it RESETS prior practice data first, so it is safe to re-run.
 *
 *   npx tsx scripts/seed-demo-progress.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildReport } from "../lib/grade";
import {
  applyAttempt,
  applyByBucket,
  levelFor,
  overallRating,
  START_RATING,
  type BucketInput,
  type RatingInput,
  type SubjectState,
} from "../lib/rating";
import type { Attempt, Difficulty, Question, Subject } from "../lib/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];
const DAYS = 30;
const ckey = (s: string, c: string) => `${s}|${c}`;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = () => Math.random();
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** How much/well a student practises. `talent` shifts accuracy; `maxDay` < DAYS makes them inactive recently. */
type Archetype = { name: string; talent: number; sessionProb: number; maxDay: number; twoChance: number };
const ARCHETYPES: Archetype[] = [
  { name: "active", talent: 1.15, sessionProb: 0.9, maxDay: DAYS, twoChance: 0.3 },
  { name: "steady", talent: 1.0, sessionProb: 0.6, maxDay: DAYS, twoChance: 0.15 },
  { name: "struggling", talent: 0.82, sessionProb: 0.55, maxDay: DAYS, twoChance: 0.1 },
  { name: "lazy", talent: 0.92, sessionProb: 0.38, maxDay: DAYS, twoChance: 0.05 },
  { name: "inactive", talent: 1.02, sessionProb: 0.7, maxDay: 16, twoChance: 0.1 },
];

function baseAccuracy(dayFrac: number, subject: Subject, talent: number): number {
  let acc = 0.42 + 0.4 * dayFrac + (talent - 1) * 0.5;
  if (subject === "Biology") acc += 0.06;
  else if (subject === "Chemistry") acc -= 0.05;
  return acc;
}
const diffAdj = (d: Difficulty) => (d === "Easy" ? 0.15 : d === "Hard" ? -0.18 : 0);

// ── locate the cohort ──────────────────────────────────────────────────────
// Anchor on the logged-in student (SEED_STUDENT_EMAIL) to resolve the RIGHT
// centre even when stale duplicate "Demo NEET Centre" rows exist, then seed
// every student in that centre's batches (= the teacher's class).
type Stu = { id: string; name: string };
async function findCohort(): Promise<{ students: Stu[]; anchorId: string | null }> {
  let anchorId: string | null = null;
  let batchId: string | null = null;

  const email = process.env.SEED_STUDENT_EMAIL;
  if (email) {
    for (let page = 1; ; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
      if (u) {
        const { data: s } = await sb.from("students").select("id, batch_id").eq("profile_id", u.id).maybeSingle();
        if (s) { anchorId = s.id as string; batchId = s.batch_id as string; }
        break;
      }
      if (data.users.length < 1000) break;
    }
  }
  if (!batchId) throw new Error("Could not resolve the logged-in student's batch (set SEED_STUDENT_EMAIL).");

  const { data: batch } = await sb.from("batches").select("centre_id").eq("id", batchId).maybeSingle();
  const centreId = batch?.centre_id as string | undefined;
  if (!centreId) throw new Error("Could not resolve the student's centre.");

  const { data: batches } = await sb.from("batches").select("id").eq("centre_id", centreId);
  const batchIds = (batches ?? []).map((b) => b.id as string);
  const { data: studs } = await sb
    .from("students")
    .select("id, name")
    .in("batch_id", batchIds)
    .order("created_at", { ascending: true });
  const students = (studs ?? []).map((s) => ({ id: s.id as string, name: s.name as string }));
  if (students.length === 0) throw new Error("No students in the cohort.");
  return { students, anchorId };
}

// ── global question pool grouped by subject → chapter ──────────────────────
type Pool = Record<Subject, Map<string, Question[]>>;
async function loadPool(): Promise<Pool> {
  const cols = "id, subject, chapter, concept, difficulty, par_time_sec, body, options, answer_index";
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("questions")
      .select(cols)
      .is("centre_id", null)
      .eq("status", "live")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const pool: Pool = { Physics: new Map(), Chemistry: new Map(), Biology: new Map() };
  for (const r of rows) {
    const subj = r.subject as Subject;
    if (!pool[subj]) continue;
    const q: Question = {
      id: r.id,
      subject: subj,
      chapter: r.chapter,
      concept: r.concept,
      difficulty: r.difficulty as Difficulty,
      parTimeSec: r.par_time_sec,
      text: r.body,
      options: (r.options as string[]) ?? [],
      answerIndex: r.answer_index,
    };
    if (!pool[subj].has(q.chapter)) pool[subj].set(q.chapter, []);
    pool[subj].get(q.chapter)!.push(q);
  }
  return pool;
}

async function reset(studentId: string) {
  const { data: atts } = await sb.from("attempts").select("id").eq("student_id", studentId);
  const attemptIds = (atts ?? []).map((a) => a.id as string);
  await sb.from("rating_events").delete().eq("student_id", studentId);
  if (attemptIds.length) await sb.from("answers").delete().in("attempt_id", attemptIds);
  await sb.from("attempts").delete().eq("student_id", studentId);
  await sb.from("student_ratings").delete().eq("student_id", studentId);
  await sb.from("student_chapter_ratings").delete().eq("student_id", studentId);
  await sb.from("mocks").delete().eq("owner_student_id", studentId);
}

async function runSession(
  studentId: string,
  questions: Question[],
  when: Date,
  dayFrac: number,
  talent: number,
  subjectState: Record<Subject, SubjectState>,
  chapterState: Record<string, SubjectState>,
  seenCorrect: Set<string>,
) {
  const chapter = questions[0].chapter;
  const subject = questions[0].subject;
  const iso = when.toISOString();

  const answers: Attempt[] = questions.map((q) => {
    const par = q.parTimeSec || 60;
    const pBlank = Math.max(0.02, 0.1 * (1 - dayFrac));
    if (rand() < pBlank) return { questionId: q.id, pickedIndex: null, timeSec: Math.round(par * (0.3 + rand() * 0.5)) };
    const pCorrect = clamp(baseAccuracy(dayFrac, subject, talent) + diffAdj(q.difficulty) + (rand() - 0.5) * 0.16, 0.05, 0.96);
    const correct = rand() < pCorrect;
    let picked = q.answerIndex;
    if (!correct) { do { picked = Math.floor(rand() * 4); } while (picked === q.answerIndex); }
    let factor = 0.6 + rand() * 0.9;
    if (correct && rand() < 0.12) factor = 1.5 + rand() * 0.6;
    if (!correct && rand() < 0.15) factor = 0.15 + rand() * 0.2;
    return { questionId: q.id, pickedIndex: picked, timeSec: Math.max(3, Math.round(par * factor)) };
  });

  const report = buildReport(questions, answers);

  const { data: mock, error: mErr } = await sb
    .from("mocks")
    .insert({ centre_id: null, batch_id: null, owner_student_id: studentId, kind: "lesson", title: `${chapter} — practice`, status: "published", max_attempts: 1, created_at: iso })
    .select("id")
    .single();
  if (mErr) throw mErr;
  const mockId = mock.id as string;
  await sb.from("mock_questions").insert(questions.map((q, position) => ({ mock_id: mockId, question_id: q.id, position })));

  const { data: attempt, error: aErr } = await sb
    .from("attempts")
    .insert({ mock_id: mockId, student_id: studentId, submitted_at: iso, total_marks: report.score, max_marks: report.maxScore, accuracy: report.accuracyPct })
    .select("id")
    .single();
  if (aErr) throw aErr;
  const attemptId = attempt.id as string;
  await sb.from("answers").insert(answers.map((a) => ({ attempt_id: attemptId, question_id: a.questionId, picked_index: a.pickedIndex, time_sec: a.timeSec })));

  const inputs: RatingInput[] = report.items.map((it) => ({
    questionId: it.question.id, subject: it.question.subject, difficulty: it.question.difficulty,
    attempted: it.attempted, correct: it.correct, previouslyCorrect: seenCorrect.has(it.question.id),
  }));
  const res = applyAttempt(subjectState, inputs);
  Object.assign(subjectState, res.finalSubjects);

  const bucketInputs: BucketInput[] = report.items.map((it) => ({
    bucket: ckey(it.question.subject, it.question.chapter), difficulty: it.question.difficulty,
    attempted: it.attempted, correct: it.correct, previouslyCorrect: seenCorrect.has(it.question.id),
  }));
  Object.assign(chapterState, applyByBucket(chapterState, bucketInputs).final);

  if (res.deltas.length) {
    await sb.from("rating_events").insert(res.deltas.map((d) => ({
      attempt_id: attemptId, question_id: d.questionId, student_id: studentId,
      subject: d.subject, delta: d.delta, rating_after: d.ratingAfter, created_at: iso,
    })));
  }
  for (const it of report.items) if (it.correct) seenCorrect.add(it.question.id);
}

async function seedStudent(student: Stu, pool: Pool, subjChapters: Record<Subject, string[]>, arch: Archetype) {
  await reset(student.id);

  const subjectState: Record<Subject, SubjectState> = {
    Physics: { rating: START_RATING, questionsRated: 0 },
    Chemistry: { rating: START_RATING, questionsRated: 0 },
    Biology: { rating: START_RATING, questionsRated: 0 },
  };
  const chapterState: Record<string, SubjectState> = {};
  const seenCorrect = new Set<string>();
  const usedByChapter = new Map<string, Set<string>>();

  const subjectBag: Subject[] = ["Biology", "Biology", "Biology", "Biology", "Physics", "Physics", "Physics", "Chemistry", "Chemistry"];
  const ring: Record<Subject, number> = { Physics: 0, Chemistry: 0, Biology: 0 };

  const now = Date.now();
  let sessions = 0;
  for (let day = 0; day < arch.maxDay; day++) {
    if (rand() > arch.sessionProb) continue;
    const dayFrac = day / (DAYS - 1);
    const count = rand() < arch.twoChance ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const subject = pick(subjectBag);
      const chapters = subjChapters[subject];
      if (chapters.length === 0) continue;
      let chapter: string;
      if (rand() < 0.25 && ring[subject] > 0) chapter = chapters[Math.floor(rand() * Math.min(ring[subject] + 1, chapters.length))];
      else { chapter = chapters[ring[subject] % chapters.length]; ring[subject]++; }

      const poolQs = pool[subject].get(chapter) ?? [];
      if (poolQs.length === 0) continue;
      const used = usedByChapter.get(ckey(subject, chapter)) ?? new Set<string>();
      const fresh = shuffle(poolQs.filter((q) => !used.has(q.id)));
      const target = Math.min(10, Math.max(6, poolQs.length));
      const chosen = (fresh.length >= target ? fresh : shuffle(poolQs)).slice(0, target);
      chosen.forEach((q) => used.add(q.id));
      usedByChapter.set(ckey(subject, chapter), used);

      const when = new Date(now - (DAYS - 1 - day) * 86400000 + (8 + Math.floor(rand() * 12)) * 3600000 + k * 5400000);
      await runSession(student.id, chosen, when, dayFrac, arch.talent, subjectState, chapterState, seenCorrect);
      sessions++;
    }
  }

  const nowIso = new Date().toISOString();
  const subjectUpserts = SUBJECTS.map((s) => ({
    student_id: student.id, subject: s, rating: subjectState[s].rating,
    questions_rated: subjectState[s].questionsRated, level: levelFor(subjectState[s].rating, null).name, updated_at: nowIso,
  }));
  const overall = overallRating({ Physics: subjectState.Physics.rating, Chemistry: subjectState.Chemistry.rating, Biology: subjectState.Biology.rating });
  subjectUpserts.push({
    student_id: student.id, subject: "Overall" as Subject, rating: overall,
    questions_rated: SUBJECTS.reduce((n, s) => n + subjectState[s].questionsRated, 0),
    level: levelFor(overall, null).name, updated_at: nowIso,
  });
  await sb.from("student_ratings").upsert(subjectUpserts, { onConflict: "student_id,subject" });

  const chapterUpserts = Object.entries(chapterState)
    .filter(([, st]) => st.questionsRated > 0)
    .map(([key, st]) => {
      const [subject, chapter] = key.split("|");
      return { student_id: student.id, subject, chapter, rating: st.rating, questions_rated: st.questionsRated, level: levelFor(st.rating, null).name, updated_at: nowIso };
    });
  if (chapterUpserts.length) await sb.from("student_chapter_ratings").upsert(chapterUpserts, { onConflict: "student_id,subject,chapter" });

  return { sessions, overall, level: levelFor(overall, null).name };
}

async function main() {
  const { students, anchorId } = await findCohort();
  console.log(`Seeding demo for ${students.length} student(s)\n`);

  const pool = await loadPool();
  for (const s of SUBJECTS) if (pool[s].size === 0) throw new Error(`No global questions for ${s}.`);

  // One shared chapter set so the class overlaps (weak-chapter aggregation is meaningful).
  const chaptersFor = (s: Subject) =>
    shuffle([...pool[s].entries()].filter(([, qs]) => qs.length >= 5).map(([c]) => c)).slice(0, 8);
  const subjChapters: Record<Subject, string[]> = {
    Physics: chaptersFor("Physics"),
    Chemistry: chaptersFor("Chemistry"),
    Biology: chaptersFor("Biology"),
  };

  // The logged-in student is "active" (rich personal dashboard); the rest draw
  // from a varied pool so the class shows a struggler and an inactive student.
  const NON_ANCHOR: Archetype[] = [ARCHETYPES[2], ARCHETYPES[4], ARCHETYPES[1], ARCHETYPES[3]]; // struggling, inactive, steady, lazy
  let j = 0;
  for (const student of students) {
    const arch = student.id === anchorId ? ARCHETYPES[0] : NON_ANCHOR[j++ % NON_ANCHOR.length];
    const r = await seedStudent(student, pool, subjChapters, arch);
    console.log(`  • ${student.name.padEnd(18)} ${arch.name.padEnd(11)} ${r.sessions} sessions  →  ${r.overall} ${r.level}`);
  }

  console.log(`\n✓ Done — seeded ${students.length} students over ${DAYS} days.`);
}

main().catch((e) => {
  console.error("\n✗ Demo seed failed:", e?.message ?? e);
  process.exit(1);
});
