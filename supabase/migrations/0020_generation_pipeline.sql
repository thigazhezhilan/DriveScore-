-- 0020_generation_pipeline.sql — Per-language AI question generation pipeline
--
-- Adds three things to the questions table:
--   1. `language` — which language this row's content is in ('en' | 'ta')
--   2. `status`   — lifecycle gate: 'draft' | 'verified' | 'live'
--   3. Neutral content columns: body, options, explanation, verifier_raw, verifier_index
--
-- Design intent:
--   OLD bilingual rows (body_en + body_ta on the same row, added by 0017/0019)
--   are LEFT UNTOUCHED and still read by the existing practice/test flows.
--   NEW AI-generated rows use the neutral columns + an explicit language tag.
--   The two designs coexist in the same table; the language column distinguishes them.
--
-- Backfill:
--   Existing rows with Tamil-only content (body_ta IS NOT NULL, body_en IS NULL)
--   get language = 'ta'. Everything else gets 'en'.
--   All existing rows get status = 'live' (they are already in production).
--
-- Idempotent / re-runnable.

-- ─── 1. Language tag ──────────────────────────────────────────────────────────

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS language text CHECK (language IN ('en', 'ta'));

-- Tamil-only rows
UPDATE questions
  SET language = 'ta'
  WHERE language IS NULL
    AND body_ta  IS NOT NULL
    AND body_en  IS NULL;

-- Everything else is English
UPDATE questions
  SET language = 'en'
  WHERE language IS NULL;

-- ─── 2. Lifecycle status ──────────────────────────────────────────────────────

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live'
    CHECK (status IN ('draft', 'verified', 'live'));

-- ─── 3. Neutral content columns ───────────────────────────────────────────────
-- One row per language; these columns store content in whatever language the
-- row's `language` tag says.  The old body_en / body_ta etc. remain for the
-- bilingual rows created before this migration.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS body            text,
  ADD COLUMN IF NOT EXISTS options         jsonb,   -- array of 4 strings
  ADD COLUMN IF NOT EXISTS explanation     text,
  ADD COLUMN IF NOT EXISTS verifier_raw    jsonb,   -- raw model response
  ADD COLUMN IF NOT EXISTS verifier_index  int;     -- 0-indexed answer the verifier picked

-- ─── 4. Indexes ───────────────────────────────────────────────────────────────

-- Anchor fetch: WHERE language=$lang AND subject=$s AND chapter=$c AND source='pyq' AND status='live'
CREATE INDEX IF NOT EXISTS questions_lang_chapter_gen_idx
  ON questions (language, subject, chapter, source, status)
  WHERE centre_id IS NULL;
