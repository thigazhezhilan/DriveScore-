"use client";

/**
 * Sign-out control (client). Uses the browser Supabase client to clear the
 * session, then sends the user to /login. The middleware enforces the rest.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
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
      aria-label="Sign out"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Sign out
    </button>
  );
}
