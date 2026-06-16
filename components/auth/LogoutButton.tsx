"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const t = useTranslations("common");
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/welcome");
    router.refresh();
  };

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className={`${dark ? "btn-ghost-dark" : "btn-ghost"} px-3 py-2 text-xs`}
      aria-label={t("signOut")}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {t("signOut")}
    </button>
  );
}
