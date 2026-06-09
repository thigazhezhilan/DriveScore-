"use client";

/**
 * Small delete control for a bank question (admin). Confirms, then calls the
 * server action (which enforces centre ownership) and refreshes the list.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteQuestionAction } from "@/app/admin/questions/actions";

export function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm("Delete this question? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deleteQuestionAction(id);
      if (res.error) window.alert(res.error);
      else router.refresh();
    });
  };

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete question"
      className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
