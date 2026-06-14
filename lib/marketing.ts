/**
 * Shared content + constants for the public marketing site.
 *
 * Pure data — no DB, no auth, no engine. Imported by the marketing route group
 * (`app/(marketing)/…`) and its shared chrome (nav, footer). Keeping the copy
 * here means a single source of truth for the messaging across every page.
 *
 * Copy honesty: nothing here fabricates testimonials, centre names, or stats.
 * Anything not yet real is a clearly-marked placeholder for the founder.
 */

/** Pre-filled "book a demo" email — the primary action across the whole site.
 *  No backend needed; the reader's mail client does the work. Audience-neutral
 *  so it fits centres, schools, and individual aspirants alike. */
export const DEMO_EMAIL = "thigazhezhilanj007@gmail.com";

const DEMO_SUBJECT = "Book a DriveScore demo";
const DEMO_BODY = [
  "Hi, I'd like a demo of DriveScore.",
  "",
  "I'm a: (coaching centre / school / individual student)",
  "Name / institution:",
  "City:",
  "Approx. students (if any):",
  "Phone:",
  "",
].join("\n");

export const DEMO_MAILTO =
  `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent(DEMO_SUBJECT)}` +
  `&body=${encodeURIComponent(DEMO_BODY)}`;

/** Primary nav — order matters (rendered left→right on desktop). */
export const NAV_LINKS = [
  { href: "/welcome", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/for-centres", label: "Who it's for" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
] as const;

/** The three audiences DriveScore serves. Reused on Home + the "Who it's for"
 *  page so the messaging stays in sync. Honest framing: individuals get the same
 *  diagnosis engine; the institution-only extras (class insights, your own
 *  question bank) are described where they apply, not promised to everyone. */
export const AUDIENCES = [
  {
    name: "Coaching centres",
    desc: "Keep your faculty, your question bank, and your brand. We add instant auto-grading and the diagnosis underneath — never competing with you.",
  },
  {
    name: "Schools",
    desc: "Give your science teachers weekend-mock insight without the grading load, and show parents clear, credible progress every term.",
  },
  {
    name: "Individual aspirants",
    desc: "Preparing on your own? Get the same per-question diagnosis that tells you exactly what to fix next — concept gaps, slips, guessing, pacing.",
  },
] as const;

/** The five diagnosis buckets — the product's core differentiator.
 *  Mirrors the live engine's categories (see lib/diagnose.ts) but framed for a
 *  non-technical buyer/parent audience. Hex chips kept inline because Tailwind
 *  can't generate dynamic class names. */
export const DIAGNOSIS = [
  {
    name: "Concept Gap",
    desc: "Genuinely didn't know it — flagged for re-teaching.",
    chip: "bg-[#FF5A4D]/15 text-[#FF9A91]",
    dot: "bg-[#FF5A4D]",
  },
  {
    name: "Careless Slip",
    desc: "Knew it, rushed it — easy marks left on the table.",
    chip: "bg-[#FFB020]/15 text-[#FFD27A]",
    dot: "bg-[#FFB020]",
  },
  {
    name: "Guessing",
    desc: "Answered too fast to have actually worked it out.",
    chip: "bg-[#6C5CE7]/20 text-[#B7AEFF]",
    dot: "bg-[#6C5CE7]",
  },
  {
    name: "Too Slow",
    desc: "Got there, but burned the clock doing it.",
    chip: "bg-[#5eead4]/15 text-[#7CF0DD]",
    dot: "bg-[#5eead4]",
  },
  {
    name: "Time Management",
    desc: "Ran out of time or left it blank — a pacing problem.",
    chip: "bg-energy/15 text-energy-soft",
    dot: "bg-energy",
  },
] as const;

/** The three audience reports one mock produces. */
export const REPORTS = [
  {
    who: "For the student",
    title: "Encouraging",
    desc: "What to fix next — framed as fixable habits and wins, never as failure.",
    accent: "text-energy-soft",
    ring: "ring-energy/30",
  },
  {
    who: "For the teacher",
    title: "Monday-ready",
    desc: "Exactly which chapters to re-teach, ranked by how many students struggled.",
    accent: "text-[#B7AEFF]",
    ring: "ring-[#6C5CE7]/30",
  },
  {
    who: "For the parent",
    title: "Reassuring",
    desc: "A clear, jargon-free WhatsApp-style update they actually understand.",
    accent: "text-[#FFD27A]",
    ring: "ring-[#FFB020]/30",
  },
] as const;
