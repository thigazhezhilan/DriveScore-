import { getTranslations } from "next-intl/server";
import { listCentresForSignup } from "@/lib/db/admin";
import { SignupForm } from "@/components/auth/SignupForm";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const t = await getTranslations("auth");

  let centres: { id: string; name: string }[] = [];
  try {
    centres = await listCentresForSignup();
  } catch {
    centres = [];
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up mb-8">
        <Logo size={44} wordmarkClassName="text-2xl text-ink" />
        <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
          {t("createAccountTitle")}
        </h1>
        <p className="text-xs font-medium text-teal-deep">{t("joinCentre")}</p>
      </div>

      {centres.length === 0 ? (
        <div className="card animate-fade-up p-6 text-sm text-ink/60">
          {t("noCentres")}
        </div>
      ) : (
        <SignupForm centres={centres} />
      )}
    </main>
  );
}
