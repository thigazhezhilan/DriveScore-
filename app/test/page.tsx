/**
 * Test screen (server component).
 *
 * Loads a SPECIFIC mock by id (`/test?mock=<id>`) — the student picks it from
 * their home list of batch-assigned mocks. Access is checked server-side via the
 * user-scoped client (`getVisibleMock`, RLS): a student can only open a
 * published mock for their own batch. Question CONTENT is then loaded with the
 * service key and `answerIndex` is STRIPPED before anything reaches the browser.
 */

import Link from "next/link";
import { getMockWithQuestions } from "@/lib/db/queries";
import { getVisibleMock } from "@/lib/db/mocks";
import { requireRole, getCurrentStudent } from "@/lib/auth";
import { TestRunner } from "@/components/test/TestRunner";
import type { PublicQuestion } from "@/lib/types";

// Reads the database per-request — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function TestPage({
  searchParams,
}: {
  searchParams: { mock?: string };
}) {
  // Only students take mocks; admins/teachers are bounced to their dashboards.
  await requireRole("student");

  const mockId = searchParams.mock;
  let body: React.ReactNode;

  try {
    const student = await getCurrentStudent();

    if (!student) {
      body = (
        <SetupNotice
          title="No student record"
          detail="Your login isn't linked to a student profile yet. Ask your coaching centre to finish setting up your account."
        />
      );
    } else if (!mockId) {
      body = (
        <SetupNotice
          title="No mock selected"
          detail="Pick a mock from your home screen to begin."
        />
      );
    } else {
      // Access check: RLS only returns this mock if it's published for the
      // student's own batch. Null => not allowed.
      const allowed = await getVisibleMock(mockId);
      if (!allowed) {
        body = (
          <SetupNotice
            title="Mock unavailable"
            detail="This mock isn't assigned to your batch, or it hasn't been published yet."
          />
        );
      } else {
        const { questions } = await getMockWithQuestions(mockId);
        if (questions.length === 0) {
          body = (
            <SetupNotice
              title="Mock has no questions"
              detail="This mock doesn't have any questions yet. Check back soon."
            />
          );
        } else {
          // Strip the answer key before anything is serialised to the browser.
          const publicQuestions: PublicQuestion[] = questions.map((q) => ({
            id: q.id,
            subject: q.subject,
            chapter: q.chapter,
            concept: q.concept,
            difficulty: q.difficulty,
            parTimeSec: q.parTimeSec,
            text: q.text,
            options: q.options,
            imageUrl: q.imageUrl ?? null,
          }));
          return <TestRunner questions={publicQuestions} mockId={mockId} />;
        }
      }
    }
  } catch (err) {
    body = (
      <SetupNotice
        title="Database not configured"
        detail="Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example), then run the migrations and `npm run db:seed`."
        error={err instanceof Error ? err.message : String(err)}
      />
    );
  }

  return body;
}

function SetupNotice({
  title,
  detail,
  error,
}: {
  title: string;
  detail: string;
  error?: string;
}) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-5">
      <div className="card w-full p-6 text-center">
        <h1 className="font-display text-lg font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{detail}</p>
        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-left text-xs text-rose-700">
            {error}
          </p>
        )}
        <Link href="/" className="btn-ghost mt-5 inline-flex text-sm">
          Back to home
        </Link>
      </div>
    </main>
  );
}
