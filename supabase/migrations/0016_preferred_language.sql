-- Migration 0016: Add preferred_language to profiles
--
-- Stores the user's chosen UI language ('en' | 'ta'). Defaults to 'en'.
-- Scoped to the user's own row via RLS — only the service-key path and the
-- user themselves can write it.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'ta'));
