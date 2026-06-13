/**
 * Public self-signup page. Students and teachers create their own account and
 * pick the centre they belong to (teachers also enter a centre join code).
 */

import { BrainCircuit } from "lucide-react";
import { listCentresForSignup } from "@/lib/db/admin";
import { SignupForm } from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  let centres: { id: string; name: string }[] = [];
  try {
    centres = await listCentresForSignup();
  } catch {
    centres = [];
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal text-white shadow-sm">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="text-xs font-medium text-teal-deep">Join your coaching centre</p>
        </div>
      </div>

      {centres.length === 0 ? (
        <div className="card animate-fade-up p-6 text-sm text-ink/60">
          No coaching centres are set up yet. Ask your centre to get onboarded
          with SynapTest first.
        </div>
      ) : (
        <SignupForm centres={centres} />
      )}
    </main>
  );
}
