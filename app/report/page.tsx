import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAttempt, getStudentByProfileId } from "@/lib/db/queries";
import { buildReport } from "@/lib/grade";
import { requireUser } from "@/lib/auth";
import { ReportTabs } from "@/components/report/ReportTabs";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { attempt?: string; xp?: string; streak?: string };
}) {
  const me = await requireUser();
  const tr = await getTranslations("report");
  const tc = await getTranslations("common");
  const attemptId = searchParams.attempt;
  const gameStats = searchParams.xp
    ? { xp: Number(searchParams.xp) || 0, streak: Number(searchParams.streak) || 0 }
    : undefined;

  if (!attemptId) {
    return (
      <Notice
        title={tr("noAttemptTitle")}
        detail={tr("noAttemptBody")}
        backLabel={tc("backToHome")}
      />
    );
  }

  try {
    const loaded = await getAttempt(attemptId);
    if (!loaded) {
      return (
        <Notice
          title={tr("notFoundTitle")}
          detail={tr("notFoundBody")}
          backLabel={tc("backToHome")}
        />
      );
    }

    if (me.profile.role === "student") {
      const student = await getStudentByProfileId(me.id);
      if (!student || student.id !== loaded.studentId) {
        return (
          <Notice
            title={tr("notYoursTitle")}
            detail={tr("notYoursBody")}
            backLabel={tc("backToHome")}
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
            title={tr("outsideCentreTitle")}
            detail={tr("outsideCentreBody")}
            backLabel={tc("backToHome")}
          />
        );
      }
    }

    const report = buildReport(loaded.questions, loaded.attempts);

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
        title={tr("loadErrorTitle")}
        detail={tr("loadErrorBody")}
        backLabel={tc("backToHome")}
        error={err instanceof Error ? err.message : String(err)}
      />
    );
  }
}

function Notice({
  title,
  detail,
  backLabel,
  error,
}: {
  title: string;
  detail: string;
  backLabel: string;
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
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
