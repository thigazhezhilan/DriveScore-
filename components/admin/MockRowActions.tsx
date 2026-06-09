"use client";

/**
 * Per-mock quick actions in the admin list: publish / unpublish / delete.
 * Calls the server actions (which enforce centre ownership + publish rules)
 * and refreshes the list.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Trash2, Undo2 } from "lucide-react";
import {
  deleteMockAction,
  setMockStatusAction,
} from "@/app/admin/mocks/actions";
import type { MockStatus } from "@/lib/db/mocks";

export function MockRowActions({
  id,
  status,
}: {
  id: string;
  status: MockStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next: MockStatus = status === "published" ? "draft" : "published";
    startTransition(async () => {
      const res = await setMockStatusAction(id, next);
      if (res.error) window.alert(res.error);
      else router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm("Delete this mock? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deleteMockAction(id);
      if (res.error) window.alert(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          status === "published"
            ? "text-ink/60 hover:bg-black/[0.04]"
            : "text-teal-deep hover:bg-teal/5"
        }`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "published" ? (
          <Undo2 className="h-3.5 w-3.5" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {status === "published" ? "Unpublish" : "Publish"}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        aria-label="Delete mock"
        className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
