"use client";

/**
 * Browser Supabase client (anon/publishable key) for client components.
 *
 * Used for client-side auth actions like sign-out. It manages the same session
 * cookies the server client reads, so the two stay in sync.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
