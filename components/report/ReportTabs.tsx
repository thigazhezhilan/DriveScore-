"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GraduationCap, Home, Stethoscope, Users } from "lucide-react";
import { useSession } from "@/lib/session";
import type { Report } from "@/lib/grade";
import type { Role } from "@/lib/types";
import { StudentView } from "@/components/report/StudentView";
import { TeacherView } from "@/components/report/TeacherView";
import { ParentView } from "@/components/report/ParentView";
import { AuroraBackground } from "@/components/landing/AuroraBackground";

const TAB_IDS: { id: Role; icon: typeof GraduationCap }[] = [
  { id: "student", icon: GraduationCap },
  { id: "teacher", icon: Stethoscope },
  { id: "parent", icon: Users },
];

export function ReportTabs({
  report,
  viewerRole,
  gameStats,
}: {
  report: Report;
  viewerRole?: "student" | "teacher" | "admin";
  gameStats?: { xp: number; streak: number };
}) {
  const router = useRouter();
  const t = useTranslations("report");
  const { role, setRole, reset } = useSession();

  const retake = () => {
    reset();
    router.push("/");
  };

  const locked = viewerRole === "student";
  const view: Role = locked ? "student" : role;
  const warm = view === "student";

  const tabLabels: Record<Role, string> = {
    student: t("tabStudent"),
    teacher: t("tabTeacher"),
    parent: t("tabParent"),
  };

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative mx-auto max-w-4xl px-5 pb-10 pt-6">
        {/* Header + role toggle */}
        <header className="animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  warm ? "text-energy" : "text-teal-soft"
                }`}
              >
                {t("eyebrow")}
              </p>
              <h1
                className={`font-display font-bold text-paper ${
                  warm ? "text-2xl font-extrabold" : "text-xl"
                }`}
              >
                {warm ? t("yourBreakdown") : t("mockAnalysis")}
              </h1>
            </div>
            <button
              onClick={retake}
              className="btn-ghost-dark px-3 py-2 text-xs"
              aria-label={t("retake")}
            >
              <Home className="h-4 w-4" />
              {t("retake")}
            </button>
          </div>

          {gameStats && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1 rounded-full bg-energy/15 px-2.5 py-1 text-energy">
                ⚡ {t("xpThisRun", { xp: gameStats.xp })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-reward/15 px-2.5 py-1 text-reward">
                🔥 {t("bestStreak", { streak: gameStats.streak })}
              </span>
            </div>
          )}

          {!locked && (
            <div
              role="tablist"
              aria-label="Report view"
              className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-white/[0.06] p-1"
            >
              {TAB_IDS.map(({ id, icon: Icon }) => {
                const active = id === view;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRole(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-white/15 text-paper shadow-sm"
                        : "text-paper/55 hover:text-paper"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tabLabels[id]}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <section key={view} className="animate-fade-up mt-5">
          {view === "student" && <StudentView report={report} />}
          {view === "teacher" && <TeacherView report={report} />}
          {view === "parent" && <ParentView report={report} />}
        </section>
      </div>
    </main>
  );
}
