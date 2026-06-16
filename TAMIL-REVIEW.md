# Tamil Translation Review

This file tracks all translation decisions that need verification by a native Tamil speaker
before shipping to production. Each entry is flagged because the meaning is non-obvious,
culturally loaded, or the English phrasing has no clean Tamil equivalent.

**Format:** `key` → proposed Tamil → concern

---

## auth namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `auth.signInToAccount` | "Sign in to your account" | "உங்கள் கணக்கில் உள்நுழைக" | "உள்நுழைக" vs "உள்நுழையுங்கள்" — imperative register: is this the right politeness level for a sign-in button? |
| `auth.confirmEmailBody` | "We've sent a confirmation link..." | "...கிளிக் செய்து உங்கள் கணக்கை செயல்படுத்துங்கள்." | "செயல்படுத்துங்கள்" (activate) — confirm this reads naturally to a student. |
| `auth.errorFillAll` | "Please fill in every field and pick your centre." | "எல்லா விவரங்களையும் நிரப்பி, உங்கள் coaching centre-ஐ தேர்வு செய்யுங்கள்." | Kept "coaching centre" in English intentionally — students in Tamil Nadu use this term. Verify this is the right call. |

---

## home namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `home.neuroIntro` | "I'm Neuro, your study buddy. Let's find your wins." | "நான் நியூரோ, உங்கள் படிப்பு நண்பன். உங்கள் வலிமைகளை கண்டுபிடிப்போம்." | "வலிமைகளை கண்டுபிடிப்போம்" (let's find your strengths) — "wins" is informal; is "வலிமைகள்" the right feel, or should it be "வெற்றிகளை"? |
| `home.masteryTitle` | "Mastery Road" | "முன்னேற்ற பாதை" | Literal: "path of progress". The brand name "Mastery Road" is intentionally translated here. Check if students would prefer the English brand name. |
| `home.practiceSubtitle` | "Lesson-by-lesson tests & full NEET mocks" | "படம்படமாக பயிற்சி, முழு NEET மாக்" | "படம்படமாக" is a colloquial intensifier (step by step) — verify this is well understood and appropriate in this context. |
| `home.tagline1` | "Don't just score it." | "மதிப்பெண் மட்டும் பார்க்காதீர்கள்." | Meaning-first translation (don't just look at the score). Verify the call-to-action punchline lands. |
| `home.tagline2` | "Diagnose" | "ஏன் என்று" | Translated as "Find out why" rather than "கண்டறியுங்கள்" (diagnose). The word order with tagline3 reads as "Find out why — understand it." Verify this works as the hero tagline. |

---

## diagnosis namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `diagnosis.SELF_DOUBT.title` | "Self-Doubt" | "சரியான விடையை மாற்றியவை" | Translated as "Questions where the correct answer was changed" — this is intentionally descriptive rather than the abstract "Self-Doubt". A native Tamil speaker should confirm this is the clearest way to express this concept to a student. |
| `diagnosis.SELF_DOUBT.advice` | "You had these right, then talked yourself out of them." | "...சந்தேகத்தில் மாற்றினீர்கள். உங்கள் முதல் உணர்வை நம்புங்கள்..." | "முதல் உணர்வை நம்புங்கள்" (trust your first instinct) — "உணர்வு" literally means feeling/emotion; is "நம்பிக்கை" (confidence/trust in first answer) more precise here? |
| `diagnosis.SOLID.title` | "Solid" | "சரியும் வேகமும்" | Translated as "Correct and Fast" (both accuracy and speed). The English "Solid" carries a connotation of reliable/strong. Verify this dual-meaning title works. |
| `diagnosis.CARELESS.advice` | "You knew these but slipped — slow down on easy questions." | "...கவனக்குறைவால் தவறினீர்கள் — எளிய கேள்விகளில் கொஞ்சம் மெதுவாக செல்லுங்கள்." | "கொஞ்சம் மெதுவாக செல்லுங்கள்" (go a little slowly) — confirm "மெதுவாக" doesn't sound overly slow/negative in context. |

---

## archetype namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `archetype.SNIPER.label` | "Sniper" | "துல்லியமான" | "துல்லியமான" = "Accurate one". The English metaphor "Sniper" (precise, deliberate) is translated to its core quality. Verify students will understand this is a positive label. |
| `archetype.GAMBLER.label` | "Gambler" | "வேகமாக ஆனால் தவறான" | "Fast but wrong" — very descriptive but loses the "gambler" metaphor. A native speaker should check if a more evocative Tamil word exists (e.g., "சூதாடி" is too harsh). |
| `archetype.PANICKER.label` | "Panicker" | "கடைசியில் பதற்றம்" | "Panic at the end" — captures the diagnostic pattern but not a personality label. Verify this is clear and not harsh. |
| `archetype.BALANCED.label` | "Balanced" | "சமநிலையான" | Standard Tamil equivalent. Should be fine but double-check register. |

---

## report namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `report.parentGreeting` | "Namaste! 🙏 Here's {firstName}'s weekend mock update." | "வணக்கம்! 🙏 {firstName}-இன் இந்த வாரத்தின் மாக் தேர்வு முடிவு இதோ." | Uses "வணக்கம்" (Vanakkam) rather than "நமஸ்தே" (Namaste). Both are used in Tamil Nadu — "வணக்கம்" is more native Tamil. Verify the tone is appropriate for a parent-facing WhatsApp message. |
| `report.noWorries` | "No need to worry — these are normal, fixable patterns." | "கவலைப்பட வேண்டாம் — இவை சாதாரண, திருத்தக்கூடிய பழக்கங்கள்." | "திருத்தக்கூடிய பழக்கங்கள்" (fixable habits) — verify "பழக்கங்கள்" (habits) is the right word here vs "பிரச்சினைகள்" (problems). Habits may sound more growth-oriented. |
| `report.aiTutorBody` | "...step-by-step explanation in **Tamil** and English..." | "...விரிவான விளக்கம் கிடைக்கும்..." | The word "Tamil" in the Tamil translation is just "தமிழிலும்". This is intentional — but ensure the surrounding sentence reads naturally when **தமிழிலும்** is bolded. |

---

## teacher namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `teacher.diagLabel_SELF_DOUBT` | "Self-Doubt" | "சரியானதை மாற்றியவை" | This is a condensed label version vs the full diagnosis title. Verify "சரியானதை மாற்றியவை" reads correctly in a compact data table context (teacher dashboard). |
| `teacher.inactiveNudge` | "{count} students inactive this week" | "இந்த வாரம் {count} மாணவர்கள் செயலற்று உள்ளனர்" | ICU plural is applied using `{count}` — Tamil uses the same plural pattern as English (one vs other). The word "செயலற்று" (inactive/inactive state) — verify this is not too harsh and is a natural administrative term. |

---

## common namespace

| Key | English | Tamil (current) | Concern |
|-----|---------|-----------------|---------|
| `common.neverActive` | "never" | "ஒருபோதும் இல்லை" | "ஒருபோதும் இல்லை" = "never at all" — quite emphatic. Should this be softened to "இதுவரை இல்லை" (not yet) for students who haven't logged in yet? |

---

## Key phrases NOT translated (intentional)

These terms appear in both English and Tamil versions because they are industry-standard
terms that Tamil NEET students universally recognize in English:

- **NEET** — the exam name, always English
- **mock** / **mock test** — standard term, recognized in both languages
- **AI** — universal abbreviation
- **coaching centre** — used in the Tamil version as-is; this is how students refer to it
- **DriveScore** — brand name
- **Neuro** — mascot name
- Subject names: **Physics, Chemistry, Biology** — used in English even in Tamil-medium coaching centres
- Level names: **Aspirant, Achiever, Scholar, Ranker, Topper, White Coat** — brand level system, kept English
- **XP** — gaming term, universally understood
- **NCERT** — exam board abbreviation, always English

---

*Last updated: 2026-06-16. Reviewed by: [PENDING — needs native Tamil speaker sign-off]*
