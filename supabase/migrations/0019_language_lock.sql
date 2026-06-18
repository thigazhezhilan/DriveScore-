-- 0019_language_lock.sql — Per-user language lock
--
-- Implements the immutable language preference spec:
--   1. preferred_language becomes nullable (NULL = not yet chosen).
--      Existing rows keep their 'en' value — they are unaffected.
--   2. A BEFORE UPDATE trigger blocks any attempt to change a value once set.
--   3. Question content columns are renamed to the _en / _ta pattern so every
--      language's content lives on the same row (unified Elo / diagnosis / analytics).
--   4. A helper function exposes the caller's language for use in queries and RLS.
--   5. Seed demo data: 2 bilingual questions, 1 English-only, 1 Tamil-only,
--      plus demo students locked to each language.

-- ─── 1. Make preferred_language nullable ─────────────────────────────────────

-- The column was created NOT NULL DEFAULT 'en' in migration 0016.
-- Drop both constraints so new accounts start as NULL (not yet chosen).
-- Existing rows retain their current value ('en').
ALTER TABLE profiles
  ALTER COLUMN preferred_language DROP NOT NULL;

ALTER TABLE profiles
  ALTER COLUMN preferred_language DROP DEFAULT;

-- ─── 2. Immutability trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lock_preferred_language()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow: NULL → value (first-time selection)
  -- Block: value → different value
  -- Allow: value → same value (idempotent update, not a real change)
  IF OLD.preferred_language IS NOT NULL
     AND NEW.preferred_language IS DISTINCT FROM OLD.preferred_language THEN
    RAISE EXCEPTION
      'preferred_language is locked once set (old=%, attempted=%)',
      OLD.preferred_language, NEW.preferred_language;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_preferred_language ON profiles;

CREATE TRIGGER trg_lock_preferred_language
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION lock_preferred_language();

-- ─── 3. Rename question content columns to _en / _ta ────────────────────────
-- Migration 0017 adds body_ta / options_ta / explanation_ta (Tamil side).
-- This migration renames the original English columns to match that pattern.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'text'
  ) THEN
    ALTER TABLE questions RENAME COLUMN text TO body_en;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'options'
  ) THEN
    ALTER TABLE questions RENAME COLUMN options TO options_en;
  END IF;
END $$;

-- `explanation` may or may not exist (added between milestones).
-- Three cases handled safely:
--   a) column is still named 'explanation'  → rename it
--   b) already renamed to 'explanation_en'  → nothing to do
--   c) neither exists                        → add the column fresh
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'explanation'
  ) THEN
    ALTER TABLE questions RENAME COLUMN explanation TO explanation_en;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'explanation_en'
  ) THEN
    ALTER TABLE questions ADD COLUMN explanation_en text;
  END IF;
END $$;

-- Drop NOT NULL from body_en / options_en so Tamil-only questions (body_en IS NULL)
-- and English-only questions (body_ta IS NULL) can coexist in the same table.
ALTER TABLE questions ALTER COLUMN body_en DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN options_en DROP NOT NULL;

-- ─── 4. Helper function for RLS and query layer ───────────────────────────────
-- Returns 'en' when the caller has no preference yet (safe default so
-- unauthenticated / admin service-key calls still work).

CREATE OR REPLACE FUNCTION user_preferred_language()
RETURNS TEXT AS $$
  SELECT COALESCE(preferred_language, 'en')
  FROM profiles
  WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─── 5. Seed demo data ───────────────────────────────────────────────────────
-- The first centre (or any centre) must exist. We insert into the global pool
-- (centre_id IS NULL) so questions are accessible in practice without a batch.
--
-- Note: answer_index uses 0-based integer (0=A, 1=B, 2=C, 3=D).

-- ── 5a. Bilingual question #1 (Physics / Laws of Motion) ──
INSERT INTO questions (
  subject, chapter, concept, difficulty, par_time_sec, source,
  body_en, options_en, answer_index,
  body_ta, options_ta, explanation_en, explanation_ta,
  tamil_status
) VALUES (
  'Physics', 'Laws of Motion', 'Newton''s second law', 'Easy', 45, 'pyq',
  'What is the SI unit of force?',
  '["Joule","Newton","Watt","Pascal"]',
  1,
  'விசையின் SI அலகு என்ன?',
  '["ஜூல்","நியூட்டன்","வாட்","பாஸ்கல்"]',
  'Force is measured in newtons (N), defined as kg·m/s².',
  'விசை நியூட்டன் (N) அலகில் அளவிடப்படுகிறது; kg·m/s² ஆல் வரையறுக்கப்பட்டது.',
  'approved'
)
ON CONFLICT DO NOTHING;

-- ── 5b. Bilingual question #2 (Chemistry / Atomic Structure) ──
INSERT INTO questions (
  subject, chapter, concept, difficulty, par_time_sec, source,
  body_en, options_en, answer_index,
  body_ta, options_ta, explanation_en, explanation_ta,
  tamil_status
) VALUES (
  'Chemistry', 'Atomic Structure', 'Atomic number', 'Easy', 40, 'pyq',
  'The atomic number of an element equals the number of:',
  '["neutrons in the nucleus","protons in the nucleus","nucleons in the nucleus","electrons in the outer shell"]',
  1,
  'ஒரு தனிமத்தின் அணு எண் எதன் எண்ணிக்கைக்கு சமம்?',
  '["நியூட்ரான்களின் எண்ணிக்கை","புரோட்டான்களின் எண்ணிக்கை","நியூக்ளியான்களின் எண்ணிக்கை","வெளி கவசத்தில் உள்ள எலக்ட்ரான்கள்"]',
  'Atomic number (Z) = number of protons, which equals the number of electrons in a neutral atom.',
  'அணு எண் (Z) = புரோட்டான்களின் எண்ணிக்கை, இது நடுநிலை அணுவில் எலக்ட்ரான்களின் எண்ணிக்கைக்கு சமம்.',
  'approved'
)
ON CONFLICT DO NOTHING;

-- ── 5c. Bilingual question #3 (Biology / Cell Biology) ──
INSERT INTO questions (
  subject, chapter, concept, difficulty, par_time_sec, source,
  body_en, options_en, answer_index,
  body_ta, options_ta, explanation_en, explanation_ta,
  tamil_status
) VALUES (
  'Biology', 'Cell: The Unit of Life', 'Cell organelles', 'Easy', 40, 'pyq',
  'Which organelle is known as the "powerhouse of the cell"?',
  '["Nucleus","Ribosome","Mitochondria","Golgi apparatus"]',
  2,
  '"செல்லின் சக்தி நிலையம்" என்று அழைக்கப்படும் உறுப்பு எது?',
  '["உட்கரு","ரைபோசோம்","மைட்டோகாண்ட்ரியா","கோல்கை உறுப்பு"]',
  'Mitochondria produce ATP through cellular respiration, earning the "powerhouse" label.',
  'மைட்டோகாண்ட்ரியா செல்சுவாச வழியில் ATP உற்பத்தி செய்வதால் "சக்தி நிலையம்" என்று அழைக்கப்படுகிறது.',
  'approved'
)
ON CONFLICT DO NOTHING;

-- ── 5d. English-ONLY question (body_ta IS NULL — hidden from Tamil students) ──
INSERT INTO questions (
  subject, chapter, concept, difficulty, par_time_sec, source,
  body_en, options_en, answer_index,
  tamil_status
) VALUES (
  'Physics', 'Kinematics', 'Projectile motion', 'Medium', 90, 'pyq',
  'A ball is thrown horizontally from a height. Which quantity remains constant during the flight?',
  '["Vertical velocity","Horizontal velocity","Total speed","Vertical acceleration"]',
  1,  -- Horizontal velocity
  'none'
)
ON CONFLICT DO NOTHING;

-- ── 5e. Tamil-ONLY question (body_en IS NULL — hidden from English students) ──
INSERT INTO questions (
  subject, chapter, concept, difficulty, par_time_sec, source,
  body_ta, options_ta, answer_index,
  tamil_status
) VALUES (
  'Physics', 'Laws of Motion', 'Friction', 'Easy', 60, 'pyq',
  'இரண்டு மேற்பரப்புகளுக்கிடையே உள்ள உராய்வு விசை எதைப் பொறுத்தது?',
  '["மேற்பரப்பு பரப்பளவு","மேற்பரப்பு தன்மை மற்றும் இயல்பான விசை","பொருளின் நிறை மட்டும்","வேகம் மட்டும்"]',
  1,  -- surface nature + normal force
  'approved'
)
ON CONFLICT DO NOTHING;

-- ── 5f. Demo seed note ────────────────────────────────────────────────────────
-- Two demo students with locked language preferences can be created via
-- scripts/seed-language-demo.ts — they are auth users and cannot be seeded
-- safely in a SQL migration (no auth.users insert from SQL).
-- Run: npx tsx scripts/seed-language-demo.ts  after applying this migration.
