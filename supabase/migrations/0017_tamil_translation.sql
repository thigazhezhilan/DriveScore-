-- 0017_tamil_translation.sql — Tamil translation pipeline
-- Adds three things:
--   1. tamil_knowledge_chunks  — pgvector RAG store for retrieved context
--   2. tamil_glossary          — forced terminology (English → Tamil)
--   3. Tamil content columns on questions — using the _ta suffix to match
--      the unified _en / _ta column-naming convention from migration 0019.
-- All changes are additive and nullable-safe. Safe to re-run.

-- pgvector: already enabled in Supabase hosted projects; harmless if run twice.
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. Tamil knowledge base ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tamil_knowledge_chunks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       text        NOT NULL
    CHECK (source_type IN (
      'samacheer_textbook', 'neet_paper', 'board_paper',
      'coaching_material',  'ai_generated_seed'
    )),
  subject           text        NOT NULL
    CHECK (subject IN ('physics', 'chemistry', 'biology')),
  chapter           text,
  class_level       text,
  tamil_text        text        NOT NULL,
  english_reference text,
  embedding         vector(1536),   -- nullable: PDF chunks ingested before embedding
  created_at        timestamptz  DEFAULT now()
);

-- HNSW index — preferred over IVFFlat for growing/changing data.
CREATE INDEX IF NOT EXISTS tamil_knowledge_chunks_embedding_idx
  ON tamil_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 100);

ALTER TABLE tamil_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin full access to knowledge chunks" ON tamil_knowledge_chunks;
CREATE POLICY "admin full access to knowledge chunks"
  ON tamil_knowledge_chunks FOR ALL
  USING (auth_role() = 'admin');

DROP POLICY IF EXISTS "teacher read knowledge chunks" ON tamil_knowledge_chunks;
CREATE POLICY "teacher read knowledge chunks"
  ON tamil_knowledge_chunks FOR SELECT
  USING (auth_role() = 'teacher');

-- ─── 2. Tamil glossary ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tamil_glossary (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  english_term text  NOT NULL UNIQUE,
  tamil_term   text  NOT NULL,
  subject      text,           -- null = cross-subject
  notes        text,           -- 'NEEDS_REVIEW', 'Samacheer Class 11', etc.
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE tamil_glossary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin full access to glossary" ON tamil_glossary;
CREATE POLICY "admin full access to glossary"
  ON tamil_glossary FOR ALL
  USING (auth_role() = 'admin');

DROP POLICY IF EXISTS "teacher read glossary" ON tamil_glossary;
CREATE POLICY "teacher read glossary"
  ON tamil_glossary FOR SELECT
  USING (auth_role() = 'teacher');

-- ─── 3. Tamil content columns on questions ───────────────────────────────────
-- Named with the _ta suffix to align with the _en / _ta unified convention.
-- body_en / options_en / explanation_en are renamed in migration 0019.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS body_ta               text,
  ADD COLUMN IF NOT EXISTS options_ta            jsonb,
  ADD COLUMN IF NOT EXISTS explanation_ta        text,
  ADD COLUMN IF NOT EXISTS tamil_status          text NOT NULL DEFAULT 'none'
    CHECK (tamil_status IN (
      'none', 'ai_drafted', 'review_required',
      'review_pending', 'approved', 'rejected'
    )),
  ADD COLUMN IF NOT EXISTS tamil_confidence_notes  jsonb,    -- model's self-reported metadata
  ADD COLUMN IF NOT EXISTS tamil_drafted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS tamil_approved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS tamil_approved_by       uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS tamil_validation_result jsonb,    -- objective validator output
  ADD COLUMN IF NOT EXISTS tamil_error_log         text;     -- parse/API/validator failures

-- Reviewer queue index (worst-score questions first for review workflow).
CREATE INDEX IF NOT EXISTS questions_tamil_status_idx
  ON questions (tamil_status)
  WHERE tamil_status IN ('review_required', 'ai_drafted');
