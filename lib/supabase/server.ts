/**
 * User-scoped Supabase server client (anon/publishable key + the logged-in
 * user's session cookies).
 *
 * Used to identify the current user (`auth.getUser`) and to perform auth
 * mutations (sign in / sign out) in server actions. It is NOT used for
 * privileged data access — that stays on the service client in
 * `lib/db/client.ts`. Because RLS is enabled on the data tables, this anon
 * client deliberately can't read them; data reads go through the service key.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Server Components cookies are read-only — Next throws on set.
          // Middleware refreshes the session, so swallowing here is safe.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component — ignore */
          }
        },
      },
    },
  );
}
