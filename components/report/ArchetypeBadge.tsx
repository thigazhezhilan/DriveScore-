"use client";

import { useTranslations } from "next-intl";
import { Crosshair, Dices, Scale, TimerReset } from "lucide-react";
import type { Archetype } from "@/lib/grade";
import type { SpeedArchetype } from "@/lib/types";

const STYLE: Record<
  SpeedArchetype,
  { icon: typeof Crosshair; chip: string; ring: string }
> = {
  SNIPER:   { icon: Crosshair,   chip: "bg-indigo-500/20 text-indigo-300",  ring: "ring-indigo-500/30"  },
  GAMBLER:  { icon: Dices,       chip: "bg-fuchsia-500/20 text-fuchsia-300", ring: "ring-fuchsia-500/30" },
  PANICKER: { icon: TimerReset,  chip: "bg-rose-500/20 text-rose-300",      ring: "ring-rose-500/30"    },
  BALANCED: { icon: Scale,       chip: "bg-emerald-500/20 text-emerald-300", ring: "ring-emerald-500/30" },
};

export function ArchetypeBadge({ archetype }: { archetype: Archetype | null }) {
  const t = useTranslations("archetype");
  const tr = useTranslations("report");
  if (!archetype) return null;
  const s = STYLE[archetype.type];
  const Icon = s.icon;

  return (
    <div className={`card-glass flex items-start gap-3 p-4 ring-1 ${s.ring}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${s.chip}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/45">
            {tr("yourPacingStyle")}
          </p>
          <span className={`pill ${s.chip}`}>{t(`${archetype.type}.label`)}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-paper/70">
          {t(`${archetype.type}.description`)}
        </p>
      </div>
    </div>
  );
}
