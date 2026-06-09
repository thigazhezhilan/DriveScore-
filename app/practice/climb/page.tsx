/**
 * "Climb the Lesson" game mode — student-only adaptive practice run.
 * `/practice/climb?subject=Physics&chapter=Atoms`
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { ClimbRunner } from "@/components/practice/ClimbRunner";

export const dynamic = "force-dynamic";

export default async function ClimbPage({
  searchParams,
}: {
  searchParams: { subject?: string; chapter?: string; source?: string };
}) {
  await requireRole("student");
  const subject = searchParams.subject ?? "";
  const chapter = searchParams.chapter ?? "";
  const source = searchParams.source === "ai" ? "ai" : "pyq";

  if (!subject || !chapter) {
    return (
      <main className="student-skin landing-skin relative grid min-h-dvh place-items-center bg-[#06140f] px-5 text-paper">
        <AuroraBackground />
        <div className="card-glass relative z-10 p-6 text-center">
          <p className="text-sm text-paper/70">Pick a chapter to climb.</p>
          <Link href="/practice" className="btn-ghost-dark mt-4 inline-flex text-sm">
            <ArrowLeft className="h-4 w-4" /> Practice
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f]">
      <AuroraBackground />
      <div className="relative z-10">
        <ClimbRunner subject={subject} chapter={chapter} source={source} />
      </div>
    </div>
  );
}
