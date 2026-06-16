"use client";

import { useTranslations } from "next-intl";
import { Crosshair, Dices, Scale, TimerReset } from "lucide-react";
import type { Archetype } from "@/lib/grade";
import type { SpeedArchetype } from "@/lib/types";

const STYLE: Record<
  SpeedArchetype,
  { icon: typeof Crosshair; chip: string; ring: string }
> = {
  SNIPER: { icon: Crosshair, chip: "bg-indigo-50 text-indigo-700", ring: "ring-indigo-200" },
  GAMBLER: { icon: Dices, chip: "bg-fuchsia-50 text-fuchsia-700", ring: "ring-fuchsia-200" },
  PANICKER: { icon: TimerReset, chip: "bg-rose-50 text-rose-700", ring: "ring-rose-200" },
  BALANCED: { icon: Scale, chip: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200" },
};

export function ArchetypeBadge({ archetype }: { archetype: Archetype | null }) {
  const t = useTranslations("archetype");
  const tr = useTranslations("report");
  if (!archetype) return null;
  const s = STYLE[archetype.type];
  const Icon = s.icon;

  return (
    <div className={`card flex items-start gap-3 p-4 ring-1 ${s.ring}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${s.chip}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            {tr("yourPacingStyle")}
          </p>
          <span className={`pill ${s.chip}`}>{t(`${archetype.type}.label`)}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink/70">
          {t(`${archetype.type}.description`)}
        </p>
      </div>
    </div>
  );
}
