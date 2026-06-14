"use client";

/**
 * FAQ accordion — accessible, keyboard-friendly disclosure list.
 *
 * Each item is a native <button> toggling its answer panel (aria-expanded +
 * aria-controls). One item open at a time. Pure client state, no app data.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type Faq = { q: string; a: string };

export function FaqAccordion({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-white/[0.07] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03]"
              >
                <span className="font-display text-base font-bold text-paper sm:text-lg">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-energy transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm leading-relaxed text-paper/70"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
