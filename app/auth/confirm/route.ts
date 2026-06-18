/**
 * Auth confirmation route handler.
 *
 * The recovery email link lands here. We establish a session from whichever
 * token the email carries, then redirect to `next` (the set-new-password page):
 *
 *   - token_hash + type  → verifyOtp  (works cross-device; recommended — set the
 *     "Reset Password" email template to:
 *       {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password )
 *   - code               → exchangeCodeForSession (default PKCE template; same
 *     device/browser only)
 *
 * On failure the user is sent back to /forgot-password with an "expired" notice.
 * Cookies are written onto the redirect response directly (route-handler safe).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/forgot-password?error=expired", origin));
  }

  // Sync NEXT_LOCALE cookie from the user's saved preferred_language so the
  // first page load after email confirmation is already in the right language.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const service = getServiceClient();
      const { data: profile } = await service
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      const locale = profile?.preferred_language === "ta" ? "ta" : "en";
      response.cookies.set("NEXT_LOCALE", locale, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      });
    }
  } catch {
    // Non-fatal — locale defaults to 'en' if this fails.
  }

  return response;
}
