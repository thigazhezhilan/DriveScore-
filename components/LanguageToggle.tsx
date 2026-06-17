"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { setLanguage } from "@/app/language/actions";

export function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === "en" ? "ta" : "en";
    startTransition(async () => {
      await setLanguage(next as "en" | "ta");
      window.location.reload();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`${dark ? "btn-ghost-dark" : "btn-ghost"} px-3 py-2 text-xs`}
      aria-label={t("switchTo")}
      title={t("switchTo")}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{t("toggle")}</span>
      <span className="sm:hidden">{locale === "en" ? t("ta") : "EN"}</span>
    </button>
  );
}
