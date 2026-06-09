/**
 * Report screen (server component).
 *
 * Loads a persisted attempt by id (`/report?attempt=<id>`) from the database,
 * then runs the EXISTING pure `buildReport` (which calls `diagnose`) on it —
 * so the diagnosis category is computed at read time, never stored. The graded
 * `Report` is handed to the client <ReportTabs> for the three-view toggle.
 *
 * Because the report is rebuilt from the DB on every load, refreshing or
 * revisiting the URL shows the same diagnosis — proving persistence.
 */

import Link from "next/link";
import { getAttempt, getStudentByProfileId } from "@/lib/db/queries";
import { buildReport } from "@/lib/grade";
import { requireUser } from "@/lib/auth";
import { ReportTabs } from "@/components/report/ReportTabs";

// Reads the database per-request — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { attempt?: string; xp?: string; streak?: string };
}) {
  const me = await requireUser();
  const attemptId = searchParams.attempt;
  const gameStats = searchParams.xp
    ? { xp: Number(searchParams.xp) || 0, streak: Number(searchParams.streak) || 0 }
    : undefined;

  if (!attemptId) {
    return (
      <Notice
        title="No attempt selected"
        detail="Take a mock first — your report opens automatically when you finish."
      />
    );
  }

  try {
    const loaded = await getAttempt(attemptId);
    if (!loaded) {
      return (
        <Notice
          title="Report not found"
          detail="That attempt doesn't exist (or was cleared). Try taking the mock again."
        />
      );
    }

    // Access control:
    //  - admin: cross-centre god-mode — can view any report
    //  - teacher: only reports within their own centre
    //  - student: only their own attempt
    if (me.profile.role === "student") {
      const student = await getStudentByProfileId(me.id);
      if (!student || student.id !== loaded.studentId) {
        return (
          <Notice
            title="Not your report"
            detail="You can only view your own mock reports."
          />
        );
      }
    } else if (me.profile.role === "teacher") {
      if (
        me.profile.centreId === null ||
        me.profile.centreId !== loaded.centreId
      ) {
        return (
          <Notice
            title="Outside your centre"
            detail="You can only view reports for students in your own coaching centre."
          />
        );
      }
    }
    // admin: no centre check — falls through to display the report

    const report = buildReport(loaded.questions, loaded.attempts);

    // Redact the answer key before serialising to the browser. The report
    // views don't use `answerIndex`; grading already happened server-side.
    const redact = <T extends { question: { answerIndex: number } }>(it: T): T => ({
      ...it,
      question: { ...it.question, answerIndex: -1 },
    });
    const safeReport = {
      ...report,
      items: report.items.map(redact),
      groups: report.groups.map((g) => ({ ...g, items: g.items.map(redact) })),
    };
    return (
      <ReportTabs report={safeReport} viewerRole={me.profile.role} gameStats={gameStats} />
    );
  } catch (err) {
    return (
      <Notice
        title="Couldn't load the report"
        detail="The database may not be configured or seeded. See .env.example and run the migration + `npm run db:seed`."
        error={err instanceof Error ? err.message : String(err)}
      />
    );
  }
}

function Notice({
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
