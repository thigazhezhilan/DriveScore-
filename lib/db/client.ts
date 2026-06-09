import "server-only";

/**
 * Server-only Supabase client.
 *
 * Uses the SECRET service_role key. The `server-only` import above makes the
 * build fail if this module is ever pulled into a client component, so the key
 * can never leak into the browser bundle.
 *
 * The client is created lazily so that simply importing this module (e.g. at
 * build time, with no env configured) does not throw — it only throws when a
 * DB call is actually attempted without configuration.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
