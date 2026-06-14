/**
 * Shared layout for the public marketing site (route group `(marketing)`).
 *
 * Wraps every marketing page — Home, About, Features, For Centres, Contact,
 * FAQ — in the dark brand shell with a sticky navbar and footer. The route
 * group keeps the URLs clean (`/welcome`, `/about`, …) without nesting a path
 * segment.
 *
 * Backgrounds are per-page: Home renders the heavier 3D <CinematicBackground/>,
 * the inner pages render the CSS <LiquidBackground/>. This layout stays static
 * and chrome-only so the pages control their own dynamic/static behaviour.
 *
 * Touches nothing in the app: no DB, no auth, no engine.
 */

import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="landing-skin relative min-h-screen overflow-x-hidden bg-[#06140f] text-paper">
      <MarketingNav />
      <main className="relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  );
}
