"use client";

/** Delete one GLOBAL bank question (admin) — dark, confirms first. */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteGlobalQuestionAction } from "@/app/admin/bank/actions";

export function BankDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteGlobalQuestionAction(id);
      if (!res.error) router.refresh();
      setArmed(false);
    });
  };

  return (
    <button
      onClick={onClick}
      onBlur={() => setArmed(false)}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
        armed
          ? "bg-pop/20 text-[#FF9A91]"
          : "text-paper/45 hover:bg-white/5 hover:text-[#FF9A91]"
      }`}
      aria-label="Delete question"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {armed ? "Confirm" : "Delete"}
    </button>
  );
}
